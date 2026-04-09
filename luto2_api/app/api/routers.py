from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.data_service import data_service

router = APIRouter()

@router.get("/geo/{filename}")
def get_geo_file(filename: str):
    """
    Serve GeoJSON boundary files (e.g. NRM_AUS, AUS_STATE).
    Geo data is static across scenarios — resolved via root-level rglob.
    Example: /api/v1/geo/NRM_AUS
    """
    try:
        return data_service.get_geo_file(filename)
    except FileNotFoundError as e:
        # Surface a clean 404 so CORS middleware wraps the error response correctly
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/spatial/{layer_name}")
def get_spatial_layer(layer_name: str):
    """
    Retrieve the Base64 image payload and Leaflet bounds from the target map layer.
    Example layer_name: 'map_area_Ag'
    """
    return data_service.get_map_layer(layer_name)

@router.get("/charts/{category}")
def get_chart_data(category: str, scenario: Optional[str] = Query(default=None)):
    """
    Retrieve the Highcharts series payload for a given category file.

    When a 'scenario' query parameter is supplied the endpoint resolves the
    file from the per-scenario directory structure:
        LUTO2_DATA_ROOT / [scenario] / data / [category].js

    When 'scenario' is omitted or empty the legacy global data_service path
    is used as a fallback, preserving backwards compatibility.

    Example: /api/v1/charts/Area_Ag?scenario=20260318_renew001
    """
    if scenario:
        try:
            return data_service.get_chart_data_for_scenario(category, scenario)
        except FileNotFoundError as e:
            # File or scenario folder doesn't exist — surface a clean 404
            # so CORS headers are always included in the response envelope
            raise HTTPException(status_code=404, detail=str(e))
        except ValueError as e:
            # Malformed .js file — clean 500 with context
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # No scenario supplied: fall back to the legacy global path
        try:
            return data_service.get_chart_data(category)
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except ValueError as e:
            raise HTTPException(status_code=500, detail=str(e))
