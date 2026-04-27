import { create } from 'zustand';

export type LutoMetric = 'Land Use' | 'Economics' | 'GHG' | 'Biodiversity' | 'Water Use' | 'Production';

interface DashboardState {
    // ── Scenario ──────────────────────────────────────────────────────────────
    /** The active scenario folder name (e.g. '20260318_renew001'). Empty string until hydrated. */
    selectedScenario: string;

    // ── Dashboard Controls ────────────────────────────────────────────────────
    primaryMetric: string;
    selectedRegionIds: string[];
    selectedLandUse: string;
    selectedYear: number;
    hoveredCategory: string | null;
    selectedWater: string;
    showBaseMap: boolean;
    showDataPoints: boolean;
    showChoropleth: boolean;
    showRezLayer: boolean;
    choroplethMode: 'total' | 'density';
    selectedAgManagement: string;
    areaDict: Record<string, number>;
    isCalculatingAreas: boolean;
    baseYear: number;

    setSelectedScenario: (scenario: string) => void;
    setPrimaryMetric: (metric: string) => void;
    setSelectedRegionIds: (ids: string[]) => void;
    setSelectedLandUse: (landUse: string) => void;
    setSelectedYear: (year: number) => void;
    setHoveredCategory: (cat: string | null) => void;
    setSelectedWater: (water: string) => void;
    toggleSelectedRegion: (id: string) => void;
    clearSelection: () => void;
    setShowBaseMap: (val: boolean) => void;
    setShowDataPoints: (val: boolean) => void;
    setShowChoropleth: (val: boolean) => void;
    setShowRezLayer: (val: boolean) => void;
    setChoroplethMode: (mode: 'total' | 'density') => void;
    setSelectedAgManagement: (val: string) => void;
    setAreaDict: (dict: Record<string, number>) => void;
    setIsCalculatingAreas: (val: boolean) => void;
    setBaseYear: (year: number) => void;
}

const useDashboardStore = create<DashboardState>((set) => ({
    // Empty string signals "not yet hydrated" — page.tsx sets this on first scenario load
    selectedScenario: '',

    primaryMetric: 'Land Use',
    selectedRegionIds: [],
    selectedLandUse: 'ALL',
    selectedYear: 2050,
    hoveredCategory: null,
    selectedWater: 'ALL',
    showBaseMap: false,
    showDataPoints: false,
    showChoropleth: true,
    showRezLayer: false,
    choroplethMode: 'total',
    selectedAgManagement: 'ALL',
    areaDict: {},
    isCalculatingAreas: false,
    baseYear: 2010,

    setSelectedScenario: (scenario) => set({ selectedScenario: scenario }),
    setPrimaryMetric: (metric) => set({ primaryMetric: metric }),
    setSelectedRegionIds: (ids) => set({ selectedRegionIds: ids }),
    setSelectedLandUse: (landUse) => set({ selectedLandUse: landUse }),
    setSelectedYear: (year) => set({ selectedYear: year }),
    setHoveredCategory: (cat) => set({ hoveredCategory: cat }),
    setSelectedWater: (water) => set({ selectedWater: water, selectedLandUse: 'ALL' }),
    toggleSelectedRegion: (id) => set((state) => ({
        selectedRegionIds: state.selectedRegionIds.includes(id)
            ? state.selectedRegionIds.filter(r => r !== id)
            : [...state.selectedRegionIds, id]
    })),
    clearSelection: () => set({ selectedRegionIds: [] }),
    setShowBaseMap: (val) => set({ showBaseMap: val }),
    setShowDataPoints: (val) => set({ showDataPoints: val }),
    setShowChoropleth: (val) => set({ showChoropleth: val }),
    setShowRezLayer: (val) => set({ showRezLayer: val }),
    setChoroplethMode: (mode) => set({ choroplethMode: mode }),
    setSelectedAgManagement: (val) => set({ selectedAgManagement: val }),
    setAreaDict: (dict) => set({ areaDict: dict }),
    setIsCalculatingAreas: (val) => set({ isCalculatingAreas: val }),
    setBaseYear: (year) => set({ baseYear: year }),
}));

export default useDashboardStore;
