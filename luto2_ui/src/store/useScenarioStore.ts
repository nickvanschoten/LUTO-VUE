import { create } from 'zustand';

export interface BoundingBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export interface ScenarioStore {
  baseScenarioId: string | null;
  targetScenarioId: string | null;
  setBaseScenarioId: (id: string | null) => void;
  setTargetScenarioId: (id: string | null) => void;

  viewportBbox: BoundingBox | null;
  setViewportBbox: (bbox: BoundingBox | null) => void;

  baseSummary: any | null;
  targetSummary: any | null;
  setBaseSummary: (summary: any) => void;
  setTargetSummary: (summary: any) => void;

  selectedYear: number;
  setSelectedYear: (year: number) => void;
  selectedVariables: string[];
  setSelectedVariables: (vars: string[]) => void;

  // UI Processing Indicators mitigating Async lag natively
  isFetchingSpatial: boolean;
  setIsFetchingSpatial: (state: boolean) => void;

  // UX UI Scale configurations intercepting WebGL logic bindings
  colorScaleParams: any | null;
  setColorScaleParams: (params: any) => void;
}

export const useScenarioStore = create<ScenarioStore>((set) => ({
  baseScenarioId: null,
  targetScenarioId: null,
  setBaseScenarioId: (id) => set({ baseScenarioId: id }),
  setTargetScenarioId: (id) => set({ targetScenarioId: id }),

  viewportBbox: null,
  setViewportBbox: (bbox) => set({ viewportBbox: bbox }),

  baseSummary: null,
  targetSummary: null,
  setBaseSummary: (summary) => set({ baseSummary: summary }),
  setTargetSummary: (summary) => set({ targetSummary: summary }),

  selectedYear: 2030,
  setSelectedYear: (year) => set({ selectedYear: year }),
  selectedVariables: ['yield_wheat'],
  setSelectedVariables: (vars) => set({ selectedVariables: vars }),

  isFetchingSpatial: false,
  setIsFetchingSpatial: (state) => set({ isFetchingSpatial: state }),

  colorScaleParams: null,
  setColorScaleParams: (params) => set({ colorScaleParams: params })
}));
