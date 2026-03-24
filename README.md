# LUTO-VUE

**Land Use Trade-Offs (LUTO) 2.0 Scenario Explorer**

LUTO-VUE is an interactive, web-based dashboard engineered to visualize and analyze multidimensional outputs from the Land Use Trade-Offs (LUTO) 2.0 model. Designed for researchers and policymakers, the application translates massive spatial and time-series datasets into actionable insights regarding the environmental, economic, and social impacts of Australian land-use scenarios. 

*Note: The name LUTO-VUE is a play on LUTO 2.0, utilizing the French word "vue" (view) to represent the dashboard's role as a lens into the model's complex data.*

---

## 1. System Architecture

LUTO-VUE utilizes a modern, component-driven framework designed to handle large-scale Geographic Information System (GIS) data without compromising browser performance. 

### Technology Stack
* **Framework:** Next.js (App Router) & React
* **State Management:** Zustand
* **Spatial Rendering:** Deck.gl & MapLibre GL
* **Data Visualization:** Highcharts & Highcharts React
* **Styling:** Tailwind CSS

### The Spatial Data Pipeline (Smart Routing)
To mitigate browser memory limits when handling gigabytes of baked GIS raster images, the application utilizes a server-side extraction pipeline:
1. The client (`MapHub.tsx`) passes progressive taxonomy parameters (Metric, Parent Category, Sub-Category, Year) to the Next.js API.
2. The server (`/api/map-layer/route.ts`) selectively reads the required `.js` payload file.
3. A deep, case-insensitive recursive extractor traverses the JSON dictionary (e.g., `blob["Beef - modified land"]["Onshore Wind"]["ALL"]["2050"]`).
4. The server returns a lightweight payload containing only the specific Base64 image string and spatial bounding box directly to the Deck.gl canvas.

### Progressive Selection Pattern
Data exploration across all analytical modules relies on a strict cascading hierarchy:
`Region` ➔ `Primary Metric` ➔ `Category (Base Land Use)` ➔ `Agricultural Management` ➔ `Timeframe`

The dashboard utilizes synchronized state watchers to preserve selections across category switches and automatically validate data intersections, ensuring robust UI stability even when specific scenario data overlaps do not exist.

---

## 2. Analytical Modules

The dashboard allows users to drill down from national aggregates to specific Natural Resource Management (NRM) regions across several core domains:

* **Land Use (Area):** Spatial and temporal distribution of agricultural, non-agricultural, and management interventions.
* **Economics:** Dual visualization of revenue and costs, featuring combined time-series chart aggregates and isolated spatial map layers.
* **Greenhouse Gas (GHG):** Carbon footprint, emissions analysis, and mitigation potential across specific land-use intersections.
* **Water Use:** Hydrological yield and consumption patterns, differentiating between dryland and irrigated infrastructure.
* **Production:** Agricultural commodity outputs, tracking domestic consumption alongside import/export analysis.
* **Biodiversity:** Tracking against Global Biodiversity Framework (GBF) targets (GBF2, 3, 4, 8), including species conservation metrics and habitat quality scoring.

---

## 3. Project Structure

```text
LUTO-VUE/
├── app/
│   ├── api/map-layer/      # Server-side spatial payload extractor (route.ts)
│   ├── globals.css         # Global Tailwind directives
│   ├── layout.tsx          # Application shell
│   └── page.tsx            # Main dashboard view and layout controller
├── components/             # Reusable UI and visualization components
│   ├── MapHub.tsx          # Deck.gl spatial engine
│   ├── TimeSeries...       # Highcharts component wrappers
│   └── LandUseArea...      # Highcharts component wrappers
├── store/                  # Zustand global state management
│   └── useDashboardStore.ts
├── data/                   # (Ignored in source control)
│   └── map_layers/         # Compiled JS spatial payloads from LUTO2 model
└── public/                 # Static assets
```
## 4. Local Development & Deployment
Prerequisites

    Node.js (v18.x or higher recommended)

    LUTO 2.0 Python model outputs. Ensure the compiled JavaScript data dictionaries are placed in a data/map_layers/ directory located one level above the Next.js project root, or update the MAP_LAYERS_DIR path in route.ts to match your local environment.

Installation & Launch
   
    Bash
    ```
    git clone [https://github.com/](https://github.com/)[Organization]/LUTO-VUE.git # Clone the repository
    npm install # install dependencies
    npm run dev # start the development server
    ```
  Open http://localhost:3000 in your web browser

Simple startup
    Run Windows 
    ```
    'start_dashboard.bat' # Windows
    ```
    Run MacOS
    ```
    'start_dashbaord.command'
    ```

## 5. License & Attribution

LUTO-VUE is a visualisation interface for the Land Use Trade-Offs v2 ([LUTO2]([url](https://github.com/land-use-trade-offs/luto-2.0))) modelling system. Developed in collaboration with Climateworks Centre and Deakin University. Please refer to the parent LUTO 2.0 repository for underlying model documentation and licensing details.
  
    
