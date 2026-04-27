# LUTO-VUE

**Land Use Trade-Offs (LUTO) 2.0 Scenario Explorer**

LUTO-VUE is an interactive, web-based dashboard engineered to visualize and analyze multidimensional outputs from the Land Use Trade-Offs (LUTO) 2.0 model. Designed for researchers and policymakers, it translates massive spatial and time-series datasets into actionable insights regarding the environmental, economic, and social impacts of Australian land-use scenarios.

> *The name LUTO-VUE uses the French word "vue" (view) — a lens into the model's complex data.*

---

## 1. System Architecture

LUTO-VUE is a dual-stack application: a **Next.js** frontend for interactive visualization and a **FastAPI** backend serving scenario data.

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | Next.js 14 (App Router) + React 18 |
| State management | Zustand |
| Spatial rendering | Deck.gl + MapLibre GL |
| Data visualization | Highcharts |
| Styling | Tailwind CSS |
| Backend API | FastAPI + Uvicorn |
| Data engine | DuckDB + Apache Arrow |

### Spatial Data Pipeline (Smart Routing)

To avoid loading gigabytes of GIS data into the browser, a server-side extraction pipeline is used:

1. `MapHub.tsx` sends taxonomy parameters (Metric, Category, Sub-Category, Year) to the Next.js API route.
2. `/api/map-layer/route.ts` reads only the required `.js` spatial payload file.
3. A deep, case-insensitive recursive extractor traverses the JSON dictionary (e.g., `blob["Beef"]["Onshore Wind"]["ALL"]["2050"]`).
4. A lightweight response containing only the Base64 image + bounding box is returned to the Deck.gl canvas.

### Progressive Selection Pattern

`Region` ➔ `Primary Metric` ➔ `Category` ➔ `Agricultural Management` ➔ `Timeframe`

---

## 2. Analytical Modules

| Module | Description |
|--------|-------------|
| **Land Use (Area)** | Spatial and temporal distribution of agricultural, non-agricultural, and management interventions |
| **Economics** | Revenue and cost time-series with isolated spatial map layers |
| **GHG** | Carbon footprint, emissions analysis, and mitigation potential |
| **Water Use** | Hydrological yield and consumption (dryland vs. irrigated) |
| **Production** | Agricultural commodity outputs including import/export analysis |
| **Biodiversity** | Tracking against GBF targets (GBF2, 3, 4, 8), habitat quality scoring |

---

## 3. Project Structure

```text
LUTO-VUE/
├── luto2_ui/                   # Next.js frontend application
│   ├── src/app/
│   │   ├── api/map-layer/      # Server-side spatial payload extractor (route.ts)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx            # Main dashboard view
│   ├── src/components/
│   │   ├── MapHub.tsx          # Deck.gl spatial engine
│   │   ├── TimeSeriesStackedChart.tsx
│   │   ├── LandUseAreaChart.tsx
│   │   └── TransitionSankey.tsx
│   ├── src/store/
│   │   └── useDashboardStore.ts
│   ├── next.config.js          # output: 'standalone' enabled
│   ├── build-portable.js       # Portable Windows release builder
│   └── public/                 # Static assets
├── luto2_api/                  # FastAPI backend
│   └── app/
│       ├── main.py             # FastAPI app + CORS config
│       ├── data_service.py     # DuckDB query engine
│       └── api/routers.py      # API route definitions
├── data/                       # (Git-ignored) LUTO2 model outputs
│   └── map_layers/             # Compiled JS spatial payloads
├── Start_Dev_Server.bat        # Developer launcher (double-click)
└── Build_Portable_Release.bat  # Portable distribution builder
```

---

## 4. Running the Dashboard

### Option A — Developer Mode (recommended for researchers with Node.js + Python)

**Prerequisites:**
- [Node.js v18+](https://nodejs.org/en/download)
- [Python 3.9+](https://www.python.org/downloads)
- LUTO 2.0 model outputs placed in `./data/` (see Data Setup below)

**Launch:**

Double-click **`Start_Dev_Server.bat`** at the repo root.

This will:
1. Check that Node.js and Python are installed (with friendly error messages if not)
2. Auto-install `node_modules` and Python API dependencies on first run
3. Open two console windows — one for the API (port 8000) and one for the frontend (port 3000)

Then open **http://localhost:3000** in your browser.

> **API docs** are available at http://localhost:8000/docs

---

### Option B — Portable Release (for users with no development tools)

This approach packages the entire application into a single folder with a bundled `node.exe` — no installation required on the target machine.

**Build the release** (requires Node.js on the build machine only):

Double-click **`Build_Portable_Release.bat`** at the repo root, or run:

```bash
cd luto2_ui
npm run build:portable
```

This produces `luto2_ui/portable-release/` containing:
- `server.js` + `node_modules/` (Next.js standalone bundle)
- `node.exe` (official Node.js LTS binary for Windows x64)
- `public/` and `.next/static/` (static assets)
- `Start_LUTO_VUE.bat` (end-user launcher)

**Distribute** the `portable-release/` folder to users. They double-click `Start_LUTO_VUE.bat` and open **http://localhost:3000**.

> ⚠️ The portable release only includes the Next.js frontend. The FastAPI backend must be running separately for chart and analytical data to load.

---

### Manual Start (command line)

```bash
# Terminal 1 — FastAPI backend
cd luto2_api
pip install -e .
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2 — Next.js frontend
cd luto2_ui
npm install
npm run dev
```

---

## 5. Data Setup

Place LUTO 2.0 model outputs in the `./data/` directory (git-ignored):

```text
data/
└── <scenario_name>/
    ├── map_layers/             # Compiled JS spatial payloads (*.js)
    └── *.parquet               # Analytical scenario data
```

Set the `LUTO2_DATA_ROOT` environment variable if your data lives elsewhere:

```bash
set LUTO2_DATA_ROOT=C:\path\to\your\data   # Windows
export LUTO2_DATA_ROOT=/path/to/your/data  # macOS/Linux
```

---

## 6. License & Attribution

LUTO-VUE is a visualisation interface for the [Land Use Trade-Offs v2 (LUTO2)](https://github.com/land-use-trade-offs/luto-2.0) modelling system. Developed in collaboration with Climateworks Centre and Deakin University. Refer to the parent LUTO 2.0 repository for underlying model documentation and licensing details.
