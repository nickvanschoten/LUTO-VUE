import json
import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Root data directory — used for multi-scenario routing.
# Set LUTO2_DATA_ROOT to the absolute path of the LUTO-VUE/data/ folder.
# Falls back to a sibling 'data/' directory relative to this file's location
# (i.e. luto2_api/../data  →  LUTO-VUE/data/) for zero-config local dev.
# ---------------------------------------------------------------------------
_ROOT_DATA_DIR = Path(
    os.getenv("LUTO2_DATA_ROOT") or
    Path(__file__).resolve().parents[2] / "data"
)

# ---------------------------------------------------------------------------
# LUTO2 Static Spatial Grid Parameters (EPSG:4283 at 0.01-degree resolution)
# ---------------------------------------------------------------------------
LUTO_WEST = 112.925
LUTO_SOUTH = -43.665
LUTO_EAST = 153.625
LUTO_NORTH = -10.015
LUTO_ROWS = 3365
LUTO_COLS = 4070

class DataService:
    def __init__(self, data_directory: str = None):
        """
        Initialize the DataService.
        Update the default path below to point to where your LUTO2 output files are stored.
        """
        if data_directory is None:
            # Set this to the top-level directory where LUTO outputs are stored
            self.data_dir = Path(r"C:\Users\nvan0027\Downloads\transfer_3537439_files_2011492a\Report_Data_RE\Run_0006\DATA_REPORT")
        else:
            self.data_dir = Path(data_directory)

    def _find_file(self, filename: str) -> Path:
        """
        Recursively searches the data directory for the given filename.
        Returns the full Path if found, otherwise raises FileNotFoundError.
        """
        # rglob recursively searches all subdirectories
        matches = list(self.data_dir.rglob(filename))
        
        if not matches:
            raise FileNotFoundError(f"File '{filename}' could not be found anywhere in {self.data_dir}")
        
        # Return the first match found
        return matches[0]

    def _parse_js_file(self, file_path: Path):
        """
        Reads a .js file containing a JavaScript variable assignment 
        and safely extracts just the JSON payload.
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Split the string at the first equals sign to remove the 'window["name"] =' or 'var name ='
        if "=" in content:
            # We take everything AFTER the first '='
            json_payload = content.split("=", 1)[1]
        else:
            json_payload = content
            
        # Strip away leading/trailing whitespace, newlines, and semicolons
        clean_json_str = json_payload.strip().strip(";")
        
        try:
            return json.loads(clean_json_str)
        except json.JSONDecodeError as e:
            raise ValueError(f"JSON decode error in {file_path.name}: {e}\nExtracted string start: {clean_json_str[:50]}")

    def get_geo_file(self, name: str):
        """
        Parse a GeoJSON boundary file (e.g. NRM_AUS, AUS_STATE).

        Geo files are static across scenarios and live inside the first
        available scenario's data/geo/ subfolder:
            LUTO2_DATA_ROOT / [scenario] / data / geo / [name].js

        We search _ROOT_DATA_DIR recursively so this works regardless of
        how many scenarios are present or what they are named.
        Raises FileNotFoundError if no matching file is found anywhere.
        """
        filename = f"{name}.js" if not name.endswith('.js') else name

        # rglob from the shared root — geo files are identical across scenarios
        # so returning the first match is always correct
        matches = list(_ROOT_DATA_DIR.rglob(filename))

        if not matches:
            raise FileNotFoundError(
                f"Geo file '{filename}' could not be found anywhere under {_ROOT_DATA_DIR}"
            )

        return self._parse_js_file(matches[0])

    def get_map_layer(self, layer_name: str):
        """
        Fetches and parses spatial GeoJSON data exported from LUTO2 as a .js file.
        """
        filename = f"{layer_name}.js" if not layer_name.endswith('.js') else layer_name
        
        # Use the recursive search function to find the file
        file_path = self._find_file(filename)
        
        return self._parse_js_file(file_path)

    def get_chart_data(self, category: str):
        """
        Fetches and parses chart config/data exported from LUTO2 as a .js file.
        """
        filename = f"{category}.js" if not category.endswith('.js') else category

        # Use the recursive search function to find the file
        file_path = self._find_file(filename)

        return self._parse_js_file(file_path)

    def get_chart_data_for_scenario(self, category: str, scenario: str):
        """
        Scenario-aware chart data fetcher.

        Resolves the file at:
            LUTO2_DATA_ROOT / [scenario] / data / [category].js

        Returns the parsed JSON payload, or raises FileNotFoundError /
        ValueError (callers should catch these and return clean HTTP errors).
        """
        filename = f"{category}.js" if not category.endswith('.js') else category

        # Build the deterministic path — no rglob, no ambiguity
        file_path = _ROOT_DATA_DIR / scenario / "data" / filename

        if not file_path.is_file():
            raise FileNotFoundError(
                f"Chart file '{filename}' not found for scenario '{scenario}'. "
                f"Expected path: {file_path}"
            )

        return self._parse_js_file(file_path)

    def _decode_base64_layer(self, layer):
        import base64
        import io
        import numpy as np
        from PIL import Image

        img_data = base64.b64decode(layer["img_str"].split(',')[1])
        img = Image.open(io.BytesIO(img_data)).convert('RGB')
        img_array = np.array(img)
        
        h, w = img_array.shape[:2]
        result_array = np.full((h, w), -9999.0, dtype=np.float32)
        
        legend = layer.get("legend", {})
        
        is_categorical = False
        for k in legend.keys():
            try:
                float(k)
            except ValueError:
                is_categorical = True
                break
                
        lookup = {}
        cat_id = 1
        
        for k, hex_color in legend.items():
            rgb = tuple(int(hex_color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
            
            if is_categorical:
                lookup[rgb] = cat_id
                cat_id += 1
            else:
                try:
                    val = float(k)
                    if val < 0: 
                        continue
                    lookup[rgb] = val
                except ValueError:
                    continue
                
        v_max = layer.get("min_max", [0, 1])[1]
        
        for target_rgb, val_idx in lookup.items():
            mask = np.all(np.abs(img_array.astype(int) - target_rgb) <= 1, axis=-1)
            
            if is_categorical:
                result_array[mask] = float(val_idx)
            else:
                result_array[mask] = (val_idx / 100.0) * v_max
                
        return result_array

    def get_raw_matrix(self, scenario: str, metric: str, parentCat: str, subCat: str, year: str):
        """
        Locates and loads the raw 2D numpy matrix via a Lazy Caching architecture.
        Decodes base64 arrays on the fly if missing, caches them to disk, and returns the matrix.
        """
        import os
        import json
        import numpy as np
        
        target_cat = subCat if subCat and subCat != "ALL" else parentCat
        clean_cat = target_cat.replace(" ", "_").lower() if target_cat and target_cat != "ALL" else "all"
        clean_metric = metric.replace(" ", "_").lower()
        
        raw_dir = _ROOT_DATA_DIR / scenario / "raw"
        npy_path = raw_dir / f"{clean_metric}_{clean_cat}_{year}.npy"
        
        # 1. Check Safe .npy Cache
        if npy_path.is_file():
            try:
                matrix = np.load(npy_path)
                return matrix, (LUTO_WEST, LUTO_SOUTH, LUTO_EAST, LUTO_NORTH)
            except Exception as e:
                print(f"Error loading cached {npy_path}: {e}")
                pass # Fall through to re-extraction if corrupt
                
        # 1.5 Check pre-existing Wind/Solar TIFFs
        extracted_layers_dir = _ROOT_DATA_DIR / scenario / "data" / "map_layers" / "extracted_layers"
        tif_path = extracted_layers_dir / f"{clean_cat}_{year}.tif"
        if tif_path.is_file():
            try:
                import rasterio
                with rasterio.open(tif_path) as src:
                    matrix = src.read(1)
                os.makedirs(raw_dir, exist_ok=True)
                np.save(npy_path, matrix)
                return matrix, (LUTO_WEST, LUTO_SOUTH, LUTO_EAST, LUTO_NORTH)
            except Exception as e:
                print(f"Error loading legacy TIFF cache {tif_path}: {e}")

        # 2. On-the-Fly Extraction (Cache Miss)
        map_layers_dir = _ROOT_DATA_DIR / scenario / "data" / "map_layers"
        if not map_layers_dir.exists():
            return None, (LUTO_WEST, LUTO_SOUTH, LUTO_EAST, LUTO_NORTH)
            
        js_files = list(map_layers_dir.glob("map_*.js"))
        
        def traverse(node, current_path):
            if isinstance(node, dict) and "img_str" in node:
                yield current_path, node
            elif isinstance(node, dict):
                for k, v in node.items():
                    yield from traverse(v, current_path + [k])
        
        found_layer = None
        for js_file in js_files:
            try:
                with open(js_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if target_cat != "ALL" and target_cat not in content:
                        continue # Quick string bypass to prevent heavy JSON parsing
                        
                    if '{' not in content:
                        continue
                        
                    json_str = content[content.find('{'):content.rfind('}')+1]
                    data = json.loads(json_str)
                    
                    for path, layer in traverse(data, []):
                        if path[-1] == year:
                            if target_cat == "ALL" or target_cat in path:
                                found_layer = layer
                                break
                    if found_layer:
                        break
            except Exception:
                continue

        if not found_layer:
            return None, (LUTO_WEST, LUTO_SOUTH, LUTO_EAST, LUTO_NORTH)
            
        # 3. Robust Decoding
        matrix = self._decode_base64_layer(found_layer)
        
        # 4. Cache & Return
        os.makedirs(raw_dir, exist_ok=True)
        np.save(npy_path, matrix)
        
        return matrix, (LUTO_WEST, LUTO_SOUTH, LUTO_EAST, LUTO_NORTH)


# Instantiate globally so routers.py can import 'data_service' successfully
data_service = DataService()