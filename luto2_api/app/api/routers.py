from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Optional
import io
import numpy as np
try:
    import rasterio
    from rasterio.transform import from_bounds
except ImportError:
    rasterio = None

from app.data_service import (
    data_service,
    LUTO_WEST, LUTO_SOUTH, LUTO_EAST, LUTO_NORTH, LUTO_COLS, LUTO_ROWS
)

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

@router.get("/export/geotiff")
def export_geotiff(
    scenario: str,
    metric: str,
    year: str,
    parentCat: str = Query(default="ALL"),
    subCat: str = Query(default="ALL")
):
    """
    Generate and stream an EPSG:4283 GeoTIFF from the raw spatial matrix.
    """
    if rasterio is None:
         raise HTTPException(status_code=500, detail="rasterio is not installed on the server.")

    try:
        # data_service locates the raw 2D numpy matrix and spatial bounds
        # Returns exactly (matrix_2d_numpy, (lon_min, lat_min, lon_max, lat_max))
        matrix, _ = data_service.get_raw_matrix(scenario, metric, parentCat, subCat, year)
        
        if matrix is None:
            raise HTTPException(status_code=404, detail="Raw matrix data not available for this query.")
            
        # Geocentric Datum of Australia 1994 -> EPSG:4283
        transform = from_bounds(LUTO_WEST, LUTO_SOUTH, LUTO_EAST, LUTO_NORTH, LUTO_COLS, LUTO_ROWS)
        
        buffer = io.BytesIO()
        
        with rasterio.MemoryFile() as memfile:
            with memfile.open(
                driver='GTiff',
                height=LUTO_ROWS,
                width=LUTO_COLS,
                count=1,
                dtype=rasterio.float32,
                crs='EPSG:4283',
                transform=transform,
                nodata=-9999.0, # Explicit NoData Masking
                compress='lzw'
            ) as dataset:
                # Embedded Metadata (Self-Documenting TIFFs)
                dataset.update_tags(
                    scenario=scenario,
                    metric=metric,
                    parent_category=parentCat,
                    sub_category=subCat,
                    year=year
                )
                
                # Write the raw matrix
                dataset.write(matrix.astype(rasterio.float32), 1)
            
            # Extract bytes from MemoryFile
            buffer.write(memfile.read())
            
        buffer.seek(0)
        
        filename = f"LUTO_{scenario}_{metric}_{parentCat}_{subCat}_{year}.tif".replace(" ", "_")
        
        return StreamingResponse(
            buffer, 
            media_type="image/tiff", 
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except HTTPException:
        raise # Let FastAPI handle the 404 correctly
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GeoTIFF Generation Error: {str(e)}")
