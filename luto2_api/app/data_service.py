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


# Instantiate globally so routers.py can import 'data_service' successfully
data_service = DataService()