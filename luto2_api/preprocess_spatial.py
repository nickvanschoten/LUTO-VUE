import os
import sys
import json
import base64
import numpy as np
from PIL import Image
import io
from pathlib import Path

# Setup Root Directory Mapping
_ROOT_DATA_DIR = Path(os.getenv("LUTO2_DATA_ROOT") or Path(__file__).resolve().parent.parent / "data")

def hex_to_rgb(h):
    """Convert hex string '#FF0000' to numpy array [255, 0, 0]"""
    h = h.lstrip('#').upper()
    return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)])

def extract_payloads(data):
    """
    Recursively scans the nested JSON dictionary to isolate spatial map payloads.
    Yields (parentCat, subCat, year, layer_dict)
    Handles any nesting level safely (e.g. data[tech]["ALL"]["ALL"][year])
    """
    def traverse(node, current_path):
        if isinstance(node, dict) and "img_str" in node:
            yield current_path, node
        elif isinstance(node, dict):
            for k, v in node.items():
                yield from traverse(v, current_path + [k])
                
    for path, layer in traverse(data, []):
        year = path[-1]
        
        # Deduce the hierarchy. E.g., ['Beef', 'ALL', '2030'] or ['Onshore wind', 'ALL', 'ALL', '2030']
        if len(path) >= 3:
            parentCat = path[0]
            middle_keys = [p for p in path[1:-1] if p != "ALL"]
            subCat = middle_keys[-1] if middle_keys else "ALL"
        else:
            parentCat = path[0] if len(path) > 1 else "ALL"
            subCat = "ALL"
            
        yield parentCat, subCat, year, layer

def decode_layer(layer):
    """
    Reverses the Base64 PNG image string back into a calibrated Float32 matrix 
    using the Leaflet HTML RGB styling legend. Handles both categorical and continuous data.
    """
    import base64
    import io
    import numpy as np
    from PIL import Image

    # Decode the image
    img_data = base64.b64decode(layer["img_str"].split(',')[1])
    img = Image.open(io.BytesIO(img_data)).convert('RGB')
    img_array = np.array(img)
    
    h, w = img_array.shape[:2]
    # Use -9999.0 as the base nodata background
    result_array = np.full((h, w), -9999.0, dtype=np.float32)
    
    legend = layer.get("legend", {})
    
    # 1. Detect if legend is Categorical or Continuous
    is_categorical = False
    for k in legend.keys():
        try:
            float(k)
        except ValueError:
            is_categorical = True
            break
            
    # 2. Build the safe lookup dictionary
    lookup = {}
    cat_id = 1
    
    for k, hex_color in legend.items():
        # Strip alpha channel if present (e.g. #RRGGBBAA -> #RRGGBB)
        rgb = tuple(int(hex_color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
        
        if is_categorical:
            lookup[rgb] = cat_id
            cat_id += 1
        else:
            try:
                val = float(k)
                if val < 0: 
                    continue # Skip transparent/nodata bins
                lookup[rgb] = val
            except ValueError:
                continue
            
    # 3. Apply values using the numpy mask
    v_max = layer.get("min_max", [0, 1])[1]
    
    for target_rgb, val_idx in lookup.items():
        # Mask with tolerance for slight RGB variations
        mask = np.all(np.abs(img_array.astype(int) - target_rgb) <= 1, axis=-1)
        
        if is_categorical:
            # Assign the raw integer ID for categorical pixels
            result_array[mask] = float(val_idx)
        else:
            # Apply the v_max scaling formula for continuous pixels
            result_array[mask] = (val_idx / 100.0) * v_max
            
    return result_array

def interpolate_matrices(matrix_dict):
    """
    Linearly interpolates spatial arrays across missing simulation years.
    Args: matrix_dict = { 2030: np.array, 2035: np.array }
    """
    years = sorted(matrix_dict.keys())
    if not years:
        return {}
        
    final_dict = {}
    for i in range(len(years) - 1):
        y1, y2 = years[i], years[i+1]
        m1, m2 = matrix_dict[y1], matrix_dict[y2]
        
        final_dict[y1] = m1
        
        diff = y2 - y1
        if diff > 1:
            step = (m2 - m1) / float(diff)
            for j in range(1, diff):
                interp_y = y1 + j
                final_dict[interp_y] = m1 + (step * j)
                
    final_dict[years[-1]] = matrix_dict[years[-1]]
    return final_dict

def process_scenario(scenario: str):
    """ETL Pipeline for a single scenario."""
    print(f"\n[{scenario}] Starting Spatial ETL Pipeline...")
    scenario_dir = _ROOT_DATA_DIR / scenario
    map_layers_dir = scenario_dir / "data" / "map_layers"
    raw_out_dir = scenario_dir / "raw"
    
    if not map_layers_dir.exists():
        print(f"  [-] Directory not found: {map_layers_dir}")
        return
        
    raw_out_dir.mkdir(parents=True, exist_ok=True)
    js_files = list(map_layers_dir.glob("map_*.js"))
    
    total_saved = 0
    for js_file in js_files:
        print(f"  -> Parsing {js_file.name}")
        metric_hint = js_file.stem.replace("map_", "") # e.g. area_Ag
        
        with open(js_file, 'r', encoding='utf-8') as f:
            content = f.read()
            if '{' not in content:
                continue
            # Safely strip JavaScript variable assignment
            json_str = content[content.find('{'):content.rfind('}')+1]
            
            try:
                data = json.loads(json_str)
            except json.JSONDecodeError:
                print(f"    [!] Failed to parse JSON for {js_file.name}")
                continue
                
        series_groups = {} # (parentCat, subCat) -> { year (int): matrix }
        
        for pCat, sCat, year_str, layer in extract_payloads(data):
            # Critical Core Logic: Apply the exact EPSG pixel offset bounds adjustment
            # Original JS Bounds: [[min_lat, min_lon], [max_lat, max_lon]]
            if "bounds" in layer:
                bounds_copy = layer["bounds"].copy()
                bounds_copy[0][0] -= 0.025
                bounds_copy[0][1] -= 0.025
                bounds_copy[1][0] += 0.025
                bounds_copy[1][1] += 0.025
                layer["bounds"] = bounds_copy
            
            try:
                yr = int(year_str)
            except ValueError:
                continue
                
            matrix = decode_layer(layer)
            
            key = (pCat, sCat)
            if key not in series_groups:
                series_groups[key] = {}
            series_groups[key][yr] = matrix
            
        # Interpolate and commit to disk
        for (pCat, sCat), matrices in series_groups.items():
            completed_series = interpolate_matrices(matrices)
            
            target_cat = sCat if sCat and sCat != "ALL" else pCat
            clean_cat = target_cat.replace(" ", "_").lower() if target_cat and target_cat != "ALL" else "all"
            clean_metric = metric_hint.replace(" ", "_").lower()
            
            for yr, mat in completed_series.items():
                out_name = f"{clean_metric}_{clean_cat}_{yr}.npy"
                out_path = raw_out_dir / out_name
                np.save(str(out_path), mat)
                total_saved += 1
                
    print(f"[{scenario}] Successfully committed {total_saved} raw matrices to /raw/")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Scraping all scenarios in _ROOT_DATA_DIR...")
        for d in _ROOT_DATA_DIR.iterdir():
            if d.is_dir() and (d / "data" / "map_layers").exists():
                process_scenario(d.name)
    else:
        process_scenario(sys.argv[1])
