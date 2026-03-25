from fastapi import APIRouter
from app.data_service import data_service

router = APIRouter()

@router.get("/geo/{filename}")
def get_geo_file(filename: str):
    """
    Serve GeoJSON boundary files (e.g. NRM_AUS, AUS_STATE).
    Example: /api/v1/geo/NRM_AUS
    """
    return data_service.get_geo_file(filename)

@router.get("/spatial/{layer_name}")
def get_spatial_layer(layer_name: str):
    """
    Retrieve the Base64 image payload and Leaflet bounds from the target map layer.
    Example layer_name: 'map_area_Ag'
    """
    return data_service.get_map_layer(layer_name)

@router.get("/charts/{category}")
def get_chart_data(category: str):
    """
    Retrieve the Highcharts series payload for the macro transitions or Heatmap.
    Example category: 'Area_overview_1_Land-use'
    """
    return data_service.get_chart_data(category)
