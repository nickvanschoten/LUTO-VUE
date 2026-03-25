# LUTO2 API Architectural Lessons

## 1. Spatial Geometry and Serialization (GeoArrow)
*   **Pattern**: Avoid passing raw Well-Known Binary (WKB) strings in standard Arrow for frontend rendering.
*   **Correction**: Use GeoArrow spec or pass simple point coordinates (Lat/Lon centroids) for `Deck.gl`'s `GridCellLayer`/`ScatterplotLayer`. Passing complex polygons bottlenecks the frontend CPU.

## 2. API Payload Size & Bounding Boxes
*   **Pattern**: Avoid sending large continental-scale datasets (millions of cells) in a single HTTP request.
*   **Correction**: Implement aggressive spatial aggregation (downsampling) for default continent-wide views. Only supply raw cell-level Arrow buffers when a strict bounding box (`min_lon`, `min_lat`, `max_lon`, `max_lat`) is explicitly queried.

## 3. SQL Joins on Spatial Data
*   **Pattern**: Never join datasets using floating-point Lat/Lon coordinates due to precision instability (e.g., `144.9631` vs `144.96310001`).
*   **Correction**: Always use a unique integer identifier (e.g., `cell_id` or `grid_id`) for `INNER JOIN` operations between spatial datasets (e.g., in a comparator engine).

## 4. Adaptive Spatial Aggregation (Continuous vs Categorical)
*   **Pattern**: Blindly applying `SUM()` or `AVG()` to spatial bins breaks when dealing with non-numerical outputs like classifications.
*   **Correction**: Parse the Parquet schema implicitly via DuckDB (`DESCRIBE`). Dynamically apply `AVG()` to numerical continuous fields (yields/costs) and `MODE()`/majority-rule to categorical fields (dominant land use). When computing deltas of categorical fields, cast changes as booleans (`CAST(t.x != b.x AS INTEGER)`) so the spatial bin averages reflect the "% area changed" across the aggregated cell block.

## 5. Zero-Copy WebGL Matrix Rendering
*   **Pattern**: Passing iterating objects (like Arrow array Proxies or JSON maps) into Deck.gl's `data` prop triggering millions of internal JavaScript V8 closures via standard property accessors (`getPosition: d => [d.lon, d.lat]`).
*   **Correction**: Emulate C++ memory handling in standard JS native arrays. Manually extract primitive `TypedArray` vectors from Apache Arrow (`.toArray()`), run a unified JIT-optimized contiguous array loop to interleave memory-aligned `Float32Array` positions and `Uint8Array` colors, and inject them strictly into Deck.gl's `data.attributes`. This bypasses Garbage Collection and instantly offloads vectors to the GPU.

## 6. Restoring Interaction in Buffer Modalities
*   **Pattern**: Disabling picking functionality entirely due to the architectural absence of bound row-level Proxy objects passing into the `onHover` callback.
*   **Correction**: The `info` block dispatched by Deck.gl native `TypedArray` WebGL layers strictly retains the array's index offset natively (`info.index`). Bypass object mappings and exclusively use standard array offset accesses (`Val[info.index]`) mapping the state back directly to your standard `React.useState` blocks resulting in lightning-fast native `O(1)` tooltips.

## 7. Leaflet Interactive Polygons vs Granular Arrays (Guardrail 2)
*   **Pattern**: Attempting to load high-resolution granular map matrices natively (1.1km² grid blocks) into Leaflet maps directly.
*   **Correction**: Leaflet relies purely on DOM manipulation via SVGs, crashing the browser completely if array sizes breach `~10k` nodes. To scale correctly, strict architectural separation is required: Highly granular grids are delivered exclusively as Base64 image layers (non-interactive). Actual interaction (Tooltips, Ctrl+Click selection aggregation) is explicitly reserved entirely for macro-level bounds (e.g., Natural Resource Management areas).

## 8. Cross-Filtering Layer Traps (Guardrail 3)
*   **Pattern**: Hooking Highcharts hovering events to entire Leaflet mapping re-renders forcing intense native CPU lag.
*   **Correction**: Highcharts fires visual events at 60 frames per second. Hook into these changes purely using lightweight CSS-style adjustments (like `layer.setStyle({ fillOpacity: 0.8 })`) inside a simple `Vue.watch()` function. Never unmount and re-mount map objects when hovering.

## 9. Highcharts High-Density SVG Crashing (Guardrail 1)
*   **Pattern**: Delivering millions of rows of transition paths natively to Sankey or Heatmap configuration matrices. 
*   **Correction**: Always explicitly pre-aggregate analytical layers inside target JS components using standard functional reducers calculating global sums *prior* to inserting them inside `Highcharts.series.data`. Execute dictionaries mapping micro-nodes into macro-categories tracking `< 100` bounds globally ensuring framerates bypass loops effortlessly effectively scaling operations properly maintaining interactions locally.

## 10. Template Literal Escaping in Vue Setup
*   **Pattern**: Incorrectly escaping backticks (`\``) and dollar signs (`\$`) for string interpolation inside `setup()` functions because the code was copied from or initially written inside a Vue `template: \`...\`` block.
*   **Correction**: In Vue's `setup()` function, plain JavaScript rules apply. Do not escape backticks or interpolation markers (`${}`). Escaping them outside of a master template string causes "Variable declaration expected" parsing failures natively breaking component instantiation.
