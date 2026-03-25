# LUTO2 Spatial Explorer API

## 1. Plan & Architecture
- [x] Define API architecture and project structure (FastAPI, DuckDB, Arrow)
- [x] Write `implementation_plan.md` for user review
- [x] Wait for user approval on serialization format and data directory

## 2. API Backend Implementation
- [x] Incorporate performance constraints (Grid centroid coordinates, downsampling for Heavy Path default, strict `cell_id` joins).
- [x] Create `pyproject.toml` with `fastapi`, `uvicorn`, `duckdb`, `pyarrow`
- [x] Implement `main.py` (FastAPI setup, CORS, scenario discovery route)
- [x] Implement `data_service.py` (DuckDB querying, Arrow serialization, Fast/Heavy/Comparator paths)
- [x] Implement `routers.py` (Fast path, Heavy path, Comparator endpoint)
- [x] Update `lessons.md` with GeoArrow/Payload/Join/Schema rules

## 3. Frontend Implementation Phase 1
- [x] Generate `package.json` with `zustand`, `deck.gl`, `apache-arrow`
- [x] Implement `useScenarioStore.ts` for Zustand global app state
- [x] Implement `api.ts` data layer for Fast/Heavy endpoints and Arrow buffer unrolling
- [x] Build `SpatialMap.tsx` integrating Deck.gl, viewport BBox sync, and direct IPC consumption

## 4. Frontend Phase 3 (UI Polish & Analytics)
- [x] Restored O(1) Tooltip capability bypassing objects via `Deck.gl info.index` arrays.
- [x] Deployed `<Legend />` dynamic WebGL gradient scalar components.
- [x] Orchestrated native Loading indicators via UI cross-talk inside `useScenarioStore`.
- [x] Tracked native WebGL iteration logic in `lessons.md` library schemas.

## 5. Phase 4 (VUE_LUTO UX Overhaul)
- [x] Implement Climateworks Centre aesthetic (Forest green, stark white, flat UI).
- [x] Build Unified Analytical Map (`MapHub.js`) with dynamic variable selection.
- [x] Implement Cell-Level Component Guardrails intercepting Macro Level Multi-Select Aggregations safely.
- [x] Develop Cross-Filtering Vue Brushing targeting CSS arrays globally.
- [x] Build Change Matrix Heatmap Vue Component utilizing Pre-Calculations explicitly avoiding deep DOM DOM arrays.
- [x] Construct Transition Sankey Chart Components matching aggregate requirements exclusively minimizing flow charts precisely under node rendering caps natively maintaining 100+ framework constraints perfectly.

## 6. Bugfixes
- [x] Fix Vue `setup()` template literal escaping ("Variable declaration expected" error) in `MapHub.js`.

## 7. Phase 4 Wiring & QA
- [x] Wire MapHub, TransitionSankey, and ChangeHeatmap into `index.html` and `index.js`.
- [x] Refactor `Home.js` to replace legacy views with the new unified Climateworks layout.
- [x] Execute QA Protocols A, B, and C (Blocked: Environment constraints on automated browser execution in Windows).

## 8. Dual-Stack Next.js/FastAPI Migration
- [x] Draft Implementation Plan and Orchestration Scripts.
- [x] Safety Archive Legacy Vue.js Files (`index.html`, `views/`, `components/`).
- [x] Wire Backend (`data_service.py` pointing to `data/`).
- [x] Port Climateworks Aesthetic (Tailwind/CSS).
- [x] Port MapHub, TransitionSankey, and ChangeHeatmap strictly to Next.js/React.
- [x] Test the Dual-Server application boot process.

## 9. "Digital Twin" Analytical Dashboard
### Phase 1: Core Setup
- [x] Implement `store/useDashboardStore.ts` for Zustand global state
- [x] Implement `app/page.tsx` for robust API fetching and dynamic UI Controls
- [x] Implement dynamic Sub-Category filter based on backend JSON structures
- [x] Placeholders for Spatial Map and Analytical Charts

### Phase 2: The Spatial Engine
- [x] Build `components/MapHub.tsx` WebGL map with NRM boundaries.
- [x] Ensure strict bounds `type !== 'FeatureCollection'` guard.
- [x] Handle map `onClick` region filtering with explicit `updateTriggers`.
- [x] Inject MapHub into left pane of `app/page.tsx`.

### Phase 3: Volume Charts
- [x] Build `TimeSeriesStackedChart.tsx` with Universal Extractor defensive logic.
- [x] Setup Highcharts configured strictly for stacked areas natively without manual logic mapping.
- [x] Implement conditional Dual-Chart Routing in `page.tsx` mapping Macro & Micro charts successfully.

### Phase 4: Data Pipeline Fix & Flow Charts
- [x] Scrub legacy JS wrappers dynamically into JSON on fetch.
- [x] Construct `LandUseAreaChart.tsx` Area Chart explicitly matching Extractor patterns.
- [x] Securely calculate Sankey flows capturing only absolute net shifts matching strict Node properties.
- [x] Scrollable multi-chart UI flow inside `page.tsx`.

### Phase 5: Performance Optimization & Geospatial Data Binding
- [x] Memoize React Components (`MapHub`, `TimeSeriesStackedChart`, `LandUseAreaChart`, `TransitionSankey`).
- [x] Formatted Highcharts tooltip/yAxis numbers dynamically applying robust suffix tags (`B`, `M`, `k`).
- [x] Securely calculate dictionary interpolations computing spatial GeoJSON `getFillColor`.

## Phase 13: UX Polish & Cascading Filters

**Task 1: Decouple the Raster Layers**
- [x] Zustand Update: Replace `showRasterLayer` with `showBaseMap` and `showDataPoints` (default `false`).
- [x] UI Update (`page.tsx`): Replace single toggle with explicit independent "Base Land Use Map" and "Point Data Overlay" toggles.

**Task 2: Strict Raster Routing**
- [x] `MapHub.tsx`: Fetch `map_dvar_lumap.js` for `showBaseMap` and specific subCat for `showDataPoints` separating into two `BitmapLayer` stacks.
- [x] `api/map-layer/route.ts`: Remove `map_dvar_lumap` from candidates if `subCat !== 'ALL'` so specific maps aren't polluted by noisy base maps.

**Task 3: Cascading Agricultural Management**
- [x] `page.tsx`: Explicitly filter out "Agricultural Management" string from `subCategoryOptions`.
- [x] `page.tsx`: Bind `agManagementOptions` to dynamically map keys if they match `ausData[opt].some` for `selectedLandUse`.

**Task 4: Fix the Legend**
- [x] `MapHub.tsx`: Dynamically swap the "High-Res Raster" legend text labels when bounding boxes shift across `showBaseMap` or `showDataPoints`.

## Phase 14: UX Precision & Matrix Routing

**Task 1: Exorcise "Agricultural Management"**
- [x] `page.tsx`: Forcefully remove the "Agricultural Management" string using `.filter((name: string) => name.trim() !== 'Agricultural Management')` in `subCategoryOptions`.

**Task 2: Cascading Ag-Management Matrix**
- [x] `page.tsx`: Inject the hardcoded `AG_MANAGEMENTS_TO_LAND_USES` dictionary.
- [x] `page.tsx`: Rewrite `agManagementOptions` using `Object.entries` filtering based on `landUses.includes(selectedLandUse)`.

**Task 3: Choropleth Map Toggle**
- [x] `useDashboardStore.ts`: Add `showChoropleth` boolean (default `true`) and `setShowChoropleth`.
- [x] `page.tsx`: Add "Show Regional Choropleth Map" toggle above the raster toggles.
- [x] `MapHub.tsx`: Make `GeoJsonLayer` conditional upon `showChoropleth === true`.

## Phase 15: Advanced Analytical Interactions & Data Aggregation

**Task 1: Ctrl+Click Multi-Select & Bidirectional Sync**
- [x] `MapHub.tsx`: Update `onClick` to check `ctrlKey` or `metaKey` to add/remove `region` from `selectedRegionIds`.
- [x] `page.tsx`: Convert "Region Selector" `<select>` to `multiple={true}` and map multi-selections to state.

**Task 2: Choropleth Normalization (Totals vs. Density)**
- [x] `useDashboardStore.ts`: Add `choroplethMode` ('total' or 'density') and `setChoroplethMode`.
- [x] `page.tsx`: Add UI toggle for "Map Data: [Totals] | [Per Sq Km]".
- [x] `MapHub.tsx`: Modify `getFillColor` and `getTooltip` to perform `val / area` if `choroplethMode === 'density'`. Fallback gracefully if missing.

**Task 3: Chart Commodity Aggregation**
- [x] `TimeSeriesStackedChart.tsx`: Inject `COMMODITY_GROUPS` dictionary mapping.
- [x] `TimeSeriesStackedChart.tsx`: Loop `filteredSeries` and sum matching tuple years into higher-level logical category arrays for Highcharts.

## Phase 16: Caching & Analytical Aggregation

**Task 1: Boot-Time Area Caching**
- [x] `useDashboardStore.ts`: Add `areaDict` and `isCalculatingAreas` along with setters.
- [x] `page.tsx`: Move GeoJSON fetch here. Implement `calculateGeoJsonAreas`. Integrate `localStorage` mapping against 'nrm_area_cache'.
- [x] `page.tsx`: Map `isCalculatingAreas` UI loading messages.

**Task 2: Apply Density Math**
- [x] `MapHub.tsx`: Accept `geoData` as Prop, wire `areaDict` from Zustand. Add `choroplethMode === 'density'` equations in `getFillColor` and `getTooltip`.

**Task 3: Multi-Region Chart Aggregation**
- [x] `page.tsx`: Change charts' `targetRegion` prop to an array: `targetRegions`.
- [x] `Chart Components`: Map over incoming `targetRegions` array and mathematically combine matching nested Series data across all regions prior to plotting.

**Task 4: Apply Grouping to Land Use Charts**
- [x] `LandUseAreaChart.tsx`: Install the `COMMODITY_GROUPS` array mappings and apply deep structural tuples consolidation exact identically to TimeSeries.

**Task 5: Fix Regional Click Sync**
- [x] `MapHub.tsx`: In `onClick`, check `!isMulti` and set standard selections cleanly via `setSelectedRegionIds([region])`.

## Phase 17: Sync & Cache Busting

**Task 1: Casing Sync on Map Click**
- [x] `MapHub.tsx`: Read `Object.keys(blob)` inside the UI click handler to resolve the exact Title Case key before setting it into Zustand.

**Task 2: Deck.gl Repaints**
- [x] `MapHub.tsx`: Inject `choroplethMode` and `areaDict` into `updateTriggers` on the `GeoJsonLayer`.

**Task 3: Cache Busting & Validation**
- [x] `page.tsx`: Update `localStorage` cache string to `nrm_area_cache_v2`.
- [x] `MapHub.tsx`: Patch `getTooltip` to visibly render `${area.toFixed(0)} km²` alongside chart metric displays.

## Phase 18: Math Scaling & UX Polish

**Task 1: Relocate Density Math**
- [x] `MapHub.tsx`: Move the `val / area` formula inside the `dataDict` map block so `minVal` and `maxVal` scale dynamically, fixing choropleth contrast constraints.

**Task 2: Map Selection Highlights**
- [x] `MapHub.tsx`: Implement `.find(k...toLowerCase())` logic inside `getLineColor` and add `getLineWidth` for high-visibility active region boundary traces.

**Task 3: Dismissible Selection Pills UI**
- [x] `page.tsx`: Add a responsive flex-wrap badge list tracking `selectedRegionIds` below the map selector dropdown including an `&times;` dismissal hook.

## Phase 19: Reactivity & Taxonomy Enforcement

**Task 1: Fix Density Reactivity**
- [x] `page.tsx`: Bind `choroplethMode` and `showChoropleth` to `<MapHub />` explicitly routing Zustand UI actions to WebGL.

**Task 2: Enforce Strict Taxonomy**
- [x] `page.tsx`: Re-filter `subCategoryOptions` via robust string matching (`.toLowerCase().includes`), then manually inject the 3 critical infrastructure classes.

## Phase 20: Data Purging & Network Hardening

**Task 1: Hard-Purge Overlays from Charts**
- [x] `LandUseAreaChart.tsx` & `TimeSeriesStackedChart.tsx`: Apply string purging against `Agricultural Management` inside raw array extractions.

**Task 2: Correct Infrastructure Naming**
- [x] `page.tsx`: Split `Human-induced regeneration` into strict `.includes` string arrays mapping the specific `(Beef)` and `(Sheep)` indices.
- [x] `route.ts`: Intercept `Human-induced regeneration` and exact strings inside the API map loader to ensure correct `.js` filename resolution.

**Task 3: Harden Raster Fetching**
- [x] `MapHub.tsx`: Validate `res.ok` explicitly on MapHub base fetching hooks preventing 500 HTML responses from destroying the React hooks with Syntax Errors.

## Phase 21: Unified Merging & Taxonomy Alignment

**Task 1: Multi-File Analytical Merging**
- [x] `page.tsx`: Abstract JSON pulling and invoke Promise.all for Ag, NonAg, and Am subsets unifying to a single dictionary.

**Task 2: Python Master Taxonomy Execution**
- [x] `page.tsx`: Push `'Environmental Plantings', ... 'BECCS'` into dropdown menu arrays.
- [x] `route.ts`: Configure `NON_AG_CLASSES` array targeting true string nodes.

**Task 3: Suppress 404 Network Spam**
- [x] `route.ts`: Purge backend console.warn logs tracking 404 rendering dropouts forcing 200 OK silent failures.

## Phase 22: Dynamic Filtering & Fuzzy Routing

**Task 1: Fuzzy Key Matching**
- [x] `route.ts`: Normalize incoming subCats truncating parenthesis modifiers and mapping loosely across the JSON object array indexes.

**Task 2: Hoist Nested Data Assets**
- [x] `page.tsx`: De-nest Schema B dictionaries (`am[region]` & `nonAg[region]`) forcefully into the root `region` array.

**Task 3: Dynamic Zero-Value UI Filtering**
- [x] `page.tsx`: Map Highcharts tuples summing values and stripping 0-sum outputs from the UI dropdown components. Reset pointer to `options[0]` upon purge.

## Phase 23: Extreme Visibility & Pipeline Auditing

**Task 1: Expose the Data Pipeline**
- [x] `page.tsx`: Inject `console.log` traps tracing pre-hoist AM array structs and post-merge unified AUSTRALIA outputs.

**Task 2: Audit the Zero-Value Filter**
- [x] `page.tsx`: Instrument `reduce` tuple math forcing `Number(tuple[1]) || 0`. Log exact Dropdown omissions dropping below zero bounds.

**Task 3: Un-Silence the Raster Fetch**
- [x] `MapHub.tsx`: Reinstate `console.warn` error catching pipelines targeting specific Raster mapping trajectories.

## Phase 24: Deep Array Concatenation

**Task 1: The Universal Extractor**
- [x] `page.tsx`: Define `extractSeriesArray` extracting arrays spanning single arrays and nested dictionaries securely avoiding structural NaN bounds.

**Task 2: Deep Merge Datasets**
- [x] `page.tsx`: Re-architect `Promise.all` concatenating schemas explicitly stripping redundant objects.

**Task 3: Clean up Taxonomy Submaps**
- [x] `page.tsx`: Condense the subCategoryOptions `useMemo` strictly assuming `analyticalData` enforces flattened structural arrays natively.




