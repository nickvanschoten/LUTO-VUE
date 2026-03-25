"use client";

import React, { useState, useEffect, useMemo } from 'react';
import useDashboardStore from '@/store/useDashboardStore';
import MapHub from '@/components/MapHub';
import TimeSeriesStackedChart from '@/components/TimeSeriesStackedChart';
import LandUseAreaChart from '@/components/LandUseAreaChart';
import TransitionSankey from '@/components/TransitionSankey';

const API = 'http://localhost:8000/api/v1';

const METRIC_FILE_MAP: Record<string, string> = {
    'Land Use': 'Area_overview_1_Land-use',
    'Economics': 'Economics_overview_sum',
    'GHG': 'GHG_overview_sum',
    'Biodiversity': 'BIO_quality_overview_sum',
    'Water Use': 'Water_overview_NRM_sum',
    'Production': 'Production_Sum'
};

const AG_MANAGEMENTS_TO_LAND_USES: Record<string, string[]> = {
    'Asparagopsis taxiformis': ['Beef - modified land', 'Sheep - modified land', 'Dairy - natural land', 'Dairy - modified land'],
    'Precision Agriculture': ['Hay', 'Summer cereals', 'Summer legumes', 'Summer oilseeds', 'Winter cereals', 'Winter legumes', 'Winter oilseeds', 'Cotton', 'Other non-cereal crops', 'Rice', 'Sugar', 'Vegetables', 'Apples', 'Citrus', 'Grapes', 'Nuts', 'Pears', 'Plantation fruit', 'Stone fruit', 'Tropical stone fruit'],
    'Ecological Grazing': ['Beef - modified land', 'Sheep - modified land', 'Dairy - modified land'],
    'Savanna Burning': ['Beef - natural land', 'Dairy - natural land', 'Sheep - natural land', 'Unallocated - natural land'],
    'AgTech EI': ['Hay', 'Summer cereals', 'Summer legumes', 'Summer oilseeds', 'Winter cereals', 'Winter legumes', 'Winter oilseeds', 'Cotton', 'Other non-cereal crops', 'Rice', 'Sugar', 'Vegetables', 'Apples', 'Citrus', 'Grapes', 'Nuts', 'Pears', 'Plantation fruit', 'Stone fruit', 'Tropical stone fruit'],
    'Biochar': ['Hay', 'Summer cereals', 'Summer legumes', 'Summer oilseeds', 'Winter cereals', 'Winter legumes', 'Winter oilseeds', 'Apples', 'Citrus', 'Grapes', 'Nuts', 'Pears', 'Plantation fruit', 'Stone fruit', 'Tropical stone fruit'],
    'HIR - Beef': ['Beef - natural land'],
    'HIR - Sheep': ['Sheep - natural land'],
    'Utility Solar PV': ['Unallocated - modified land', 'Beef - modified land', 'Sheep - modified land', 'Dairy - modified land', 'Summer cereals', 'Summer legumes', 'Summer oilseeds', 'Winter cereals', 'Winter legumes', 'Winter oilseeds'],
    'Onshore Wind': ['Unallocated - modified land', 'Beef - modified land', 'Sheep - modified land', 'Dairy - modified land', 'Hay', 'Summer cereals', 'Summer legumes', 'Summer oilseeds', 'Winter cereals', 'Winter legumes', 'Winter oilseeds', 'Cotton', 'Other non-cereal crops', 'Rice', 'Sugar', 'Vegetables']
};

const GEOJSON_ENDPOINT = 'http://localhost:8000/api/v1/geo/NRM_AUS';

const R = 6378.137; // Earth's mean radius in km
const toRad = (degree: number) => degree * Math.PI / 180;

const ringArea = (coords: number[][]) => {
    let area = 0;
    if (coords.length > 2) {
        for (let i = 0; i < coords.length - 1; i++) {
            const p1 = coords[i];
            const p2 = coords[i + 1];
            area += toRad(p2[0] - p1[0]) * (2 + Math.sin(toRad(p1[1])) + Math.sin(toRad(p2[1])));
        }
        area = area * R * R / 2.0;
    }
    return Math.abs(area);
};

const polygonArea = (coords: number[][][]) => {
    let area = 0;
    if (coords && coords.length > 0) {
        area += ringArea(coords[0]);
        for (let i = 1; i < coords.length; i++) {
            area -= ringArea(coords[i]);
        }
    }
    return Math.abs(area);
};

const calculateGeoJsonAreas = (geoData: any): Record<string, number> => {
    const areaMap: Record<string, number> = {};
    if (!geoData || !geoData.features) return areaMap;

    geoData.features.forEach((f: any) => {
        const name = f.properties?.NRM_REGION?.trim().toLowerCase();
        if (!name || !f.geometry?.coordinates) return;

        let totalArea = 0;
        if (f.geometry.type === 'Polygon') {
            totalArea = polygonArea(f.geometry.coordinates);
        } else if (f.geometry.type === 'MultiPolygon') {
            for (let i = 0; i < f.geometry.coordinates.length; i++) {
                totalArea += polygonArea(f.geometry.coordinates[i]);
            }
        }

        // Fallback to 1 km2 if math fails to prevent division by zero
        areaMap[name] = totalArea > 0 ? totalArea : 1;
    });

    return areaMap;
};

export default function Dashboard() {
    const {
        primaryMetric, setPrimaryMetric,
        selectedYear, setSelectedYear,
        selectedLandUse, setSelectedLandUse,
        selectedRegionIds, setSelectedRegionIds,
        showBaseMap, setShowBaseMap,
        showDataPoints, setShowDataPoints,
        showChoropleth, setShowChoropleth,
        choroplethMode, setChoroplethMode,
        selectedAgManagement, setSelectedAgManagement,
        areaDict, setAreaDict,
        isCalculatingAreas, setIsCalculatingAreas,
    } = useDashboardStore();

    const [analyticalData, setAnalyticalData] = useState<any[]>([]);
    const [geoData, setGeoData] = useState<any>(null);
    const [apiStatus, setApiStatus] = useState<'loading' | 'online' | 'offline'>('loading');

    // Normalize regional array extractions across multi-schema payloads with STRICT type safety
    const extractSeriesArray = (node: any) => {
        if (!node) return [];
        if (Array.isArray(node)) return node;
        if (typeof node === 'object') {
            const target = node['ALL'] || node[Object.keys(node)[0]];
            // STRICT CHECK: Only return if it's actually an array, otherwise default to empty
            return Array.isArray(target) ? target : [];
        }
        return [];
    };

    // Fetch analytical data based on primaryMetric
    useEffect(() => {
        const fetchData = async () => {
            setApiStatus('loading');

            const fetchAndParse = async (filename: string) => {
                const url = `${API}/charts/${filename}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                const rawText = await response.text();
                // Bulletproof extraction: locate JSON by braces — immune to trailing whitespace/comments
                const firstBrace = rawText.indexOf('{');
                const lastBrace = rawText.lastIndexOf('}');
                if (firstBrace === -1 || lastBrace === -1) throw new Error('No JSON object found in response');
                return JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
            };

            try {
                let dataObj: any = {};

                if (primaryMetric === 'Land Use') {
                    // Phase 24: Deep Array Concatenation
                    const [agRes, nonAgRes, amRes] = await Promise.all([
                        fetchAndParse('Area_Ag').catch(() => ({})),
                        fetchAndParse('Area_NonAg').catch(() => ({})),
                        fetchAndParse('Area_Am').catch(() => ({}))
                    ]);

                    const allRegions = new Set([
                        ...Object.keys(agRes || {}),
                        ...Object.keys(nonAgRes || {}),
                        ...Object.keys(amRes || {})
                    ]);

                    allRegions.forEach(region => {
                        if (region === 'metadata' || region === 'default') return;

                        const agArr = extractSeriesArray(agRes?.[region]);
                        const nonAgArr = extractSeriesArray(nonAgRes?.[region]);
                        const amArr = extractSeriesArray(amRes?.[region]);

                        // Secondary safety net: guarantee iterability before spreading
                        const safeAg = Array.isArray(agArr) ? agArr : [];
                        const safeNonAg = Array.isArray(nonAgArr) ? nonAgArr : [];
                        const safeAm = Array.isArray(amArr) ? amArr : [];

                        dataObj[region] = [...safeAg, ...safeNonAg, ...safeAm];
                    });
                } else {
                    const filename = METRIC_FILE_MAP[primaryMetric];
                    if (!filename) {
                        setAnalyticalData([]);
                        return;
                    }
                    dataObj = await fetchAndParse(filename);
                }

                const arr = Array.isArray(dataObj) ? dataObj : (dataObj ? [dataObj] : []);
                setAnalyticalData(arr);
                setApiStatus('online');
            } catch (e: any) {
                console.warn(`Fetch aborted for ${primaryMetric}:`, e.message || e);
                setAnalyticalData([]);
                setApiStatus('offline');
            }
        };

        fetchData();
    }, [primaryMetric]);

    // Pre-fetch GeoJSON and Cache Geometry
    useEffect(() => {
        const loadMapContext = async () => {
            try {
                const response = await fetch(GEOJSON_ENDPOINT);
                if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                const data = await response.json();
                if (!data || data.type !== 'FeatureCollection') throw new Error('Invalid GeoJSON');
                setGeoData(data);

                // Verify Cache
                const cachedArea = localStorage.getItem('nrm_area_cache_v2');
                if (cachedArea) {
                    setAreaDict(JSON.parse(cachedArea));
                } else {
                    setIsCalculatingAreas(true);
                    // Defer heavy CPU task by 50ms so UI overlay renders "Calculating..."
                    setTimeout(() => {
                        const calculatedAreaDict = calculateGeoJsonAreas(data);
                        localStorage.setItem('nrm_area_cache_v2', JSON.stringify(calculatedAreaDict));
                        setAreaDict(calculatedAreaDict);
                        setIsCalculatingAreas(false);
                    }, 50);
                }
            } catch (err) {
                console.warn('GeoJSON initialization failed:', err);
            }
        };
        loadMapContext();
    }, []);

    const subCategoryOptions = useMemo(() => {
        if (!analyticalData || analyticalData.length === 0) return [];
        const blob = Array.isArray(analyticalData) ? analyticalData[0] : analyticalData;

        // Phase 24: Dynamic Zero-Value UI Filtering applied over safely flattened hierarchies
        const targetRegions = selectedRegionIds.length > 0 ? selectedRegionIds : ['AUSTRALIA'];
        const validSeriesSet = new Set<string>();

        targetRegions.forEach(region => {
            const regionData = blob[region];
            if (!regionData || !Array.isArray(regionData)) return; // Phase 24 guarantees flat arrays natively

            regionData.forEach((series: any) => {
                if (!series || !series.name || !Array.isArray(series.data)) return;

                const sum = series.data.reduce((acc: number, tuple: any) => acc + (Number(tuple[1]) || 0), 0);
                if (sum > 0) validSeriesSet.add(series.name);
            });
        });

        const options = Array.from(validSeriesSet);
        const filtered = options
            .filter(Boolean)
            .filter((name: string) => !name.toLowerCase().includes('agricultural management'));

        // Phase 26: Force spatial infrastructures into the main dropdown
        const requiredInfrastructures = [
            'Onshore Wind',
            'Utility Solar PV',
            'Human-induced regeneration (Beef)',
            'Human-induced regeneration (Sheep)',
            'Savanna Burning'
        ];

        requiredInfrastructures.forEach(infra => {
            if (!filtered.includes(infra)) {
                filtered.push(infra);
            }
        });

        return filtered.sort();
    }, [analyticalData, selectedRegionIds]);

    // Fallback Safety UI reset hook recovering crashed Dropdowns mapped against invalid regions
    useEffect(() => {
        if (subCategoryOptions.length > 0 && selectedLandUse !== 'ALL') {
            if (!subCategoryOptions.includes(selectedLandUse)) {
                setSelectedLandUse(subCategoryOptions[0]);
            }
        }
    }, [subCategoryOptions, selectedLandUse, setSelectedLandUse]);

    // Agricultural Management options
    const agManagementOptions = useMemo(() => {
        if (selectedLandUse === 'ALL') return [];

        // Filter the dictionary keys (Managements) where the values (Land Uses array) includes our selectedLandUse
        return Object.entries(AG_MANAGEMENTS_TO_LAND_USES)
            .filter(([management, landUses]) => landUses.includes(selectedLandUse))
            .map(([management]) => management);
    }, [selectedLandUse]);

    const availableRegions = useMemo(() => {
        if (!analyticalData || analyticalData.length === 0) return [];
        const blob = analyticalData[0];
        if (!blob) return [];
        return Object.keys(blob).filter(k => k !== 'AUSTRALIA' && k !== 'ACT').sort();
    }, [analyticalData]);

    const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
        if (selectedOptions.includes('ALL')) {
            setSelectedRegionIds([]);
        } else {
            setSelectedRegionIds(selectedOptions);
        }
    };

    return (
        <div className="flex flex-row w-screen h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
            {/* Left Pane (Spatial Engine) */}
            <div className="w-2/3 h-full relative z-0 border-r border-slate-200 bg-slate-100 flex items-center justify-center">
                <MapHub
                    geoData={geoData}
                    analyticalData={analyticalData}
                    primaryMetric={primaryMetric}
                    selectedSubCategory={selectedLandUse}
                    selectedYear={selectedYear}
                    showBaseMap={showBaseMap}
                    showDataPoints={showDataPoints}
                    showChoropleth={showChoropleth}
                    choroplethMode={choroplethMode}
                    selectedAgManagement={selectedAgManagement}
                />
            </div>

            {/* Right Pane (Analytical) */}
            <div className="w-1/3 h-full flex flex-col border-l border-slate-200 bg-white z-10 min-w-0 shadow-2xl relative">
                {/* Controls Area */}
                <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0 shadow-sm relative z-20">
                    <div className="flex items-center gap-2 mb-4">
                        <div className={`w-3.5 h-3.5 rounded-sm ${apiStatus === 'online' && !isCalculatingAreas ? 'bg-[#00E261]' : apiStatus === 'loading' || isCalculatingAreas ? 'bg-yellow-400 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-[#0F2E20]">
                            {isCalculatingAreas ? 'Calculating NRM region areas...' : apiStatus === 'online' ? 'Scenario Controls' : apiStatus === 'loading' ? 'Fetching...' : 'API Offline'}
                        </span>
                    </div>

                    <div className="space-y-4">
                        {/* Primary Metric Toggle */}
                        <div>
                            <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1.5">Simulation Analytical Category</label>
                            <select
                                value={primaryMetric}
                                onChange={e => {
                                    setPrimaryMetric(e.target.value);
                                    setSelectedLandUse('ALL');
                                }}
                                className="w-full text-xs font-bold border-2 border-[#00E261]/20 rounded-md px-2 py-2 bg-white text-[#0F2E20]"
                            >
                                <option value="Land Use">Land Use</option>
                                <option value="Production">Production</option>
                                <option value="Economics">Economics</option>
                                <option value="Water Use">Water Use</option>
                                <option value="GHG">GHG Emissions</option>
                                <option value="Biodiversity">Biodiversity</option>
                            </select>
                        </div>

                        {/* Region Selector */}
                        <div>
                            <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1.5">Region Selector</label>
                            <select
                                multiple={true}
                                value={selectedRegionIds.length === 0 ? ['ALL'] : selectedRegionIds}
                                onChange={handleRegionChange}
                                size={4}
                                className="w-full text-xs border border-slate-200 rounded-md px-2 py-2 bg-white text-[#0F2E20] focus:outline-none focus:ring-1 focus:ring-[#00E261]"
                            >
                                <option value="ALL">All Analysis Regions (Australia)</option>
                                {availableRegions.map(reg => (
                                    <option key={reg} value={reg}>{reg}</option>
                                ))}
                            </select>

                            {selectedRegionIds.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {selectedRegionIds.map(id => (
                                        <span key={id} className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                                            {id}
                                            <button
                                                onClick={() => setSelectedRegionIds(selectedRegionIds.filter(r => r !== id))}
                                                className="ml-1 text-green-600 hover:text-green-900 focus:outline-none"
                                            >
                                                &times;
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Sub-Category Filter */}
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mb-1 block">Sub-Category Filter</label>
                                <select
                                    value={selectedLandUse}
                                    onChange={e => setSelectedLandUse(e.target.value)}
                                    className="w-full text-[10px] border border-slate-200 rounded-sm px-1.5 py-1.5 bg-white font-bold"
                                >
                                    <option value="ALL">All {primaryMetric} Classes</option>
                                    {subCategoryOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Agricultural Management Filter */}
                        {agManagementOptions.length > 0 && (
                            <div>
                                <label className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mb-1 block">Agricultural Management</label>
                                <select
                                    value={selectedAgManagement}
                                    onChange={e => setSelectedAgManagement(e.target.value)}
                                    className="w-full text-[10px] border border-slate-200 rounded-sm px-1.5 py-1.5 bg-white font-bold"
                                >
                                    <option value="ALL">All Management Types</option>
                                    {agManagementOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Year Slider */}
                        <div className="pt-2">
                            <div className="flex justify-between text-[10px] font-bold mb-1.5">
                                <span className="text-[#0F2E20]">Projection Timeframe</span>
                                <span className="text-[#00E261]">{selectedYear}</span>
                            </div>
                            <input type="range" min={2020} max={2050} step="5"
                                value={selectedYear}
                                onChange={e => setSelectedYear(Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00E261]"
                            />
                        </div>

                        {/* Choropleth Toggle */}
                        <div className="pt-2">
                            <label className="flex items-center gap-2.5 cursor-pointer group mb-1.5">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={showChoropleth}
                                        onChange={(e) => setShowChoropleth(e.target.checked)}
                                    />
                                    <div className={`w-8 h-4 rounded-full transition-colors duration-200 ${showChoropleth ? 'bg-[#00E261]' : 'bg-slate-300'}`} />
                                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${showChoropleth ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">
                                    Show Regional Choropleth Map
                                </span>
                            </label>
                            {showChoropleth && (
                                <div className="flex gap-3 ml-10">
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input type="radio" checked={choroplethMode === 'total'} onChange={() => setChoroplethMode('total')} className="accent-[#00E261]" />
                                        <span className="text-[9px] font-bold text-slate-500 uppercase">Totals</span>
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input type="radio" checked={choroplethMode === 'density'} onChange={() => setChoroplethMode('density')} className="accent-[#00E261]" />
                                        <span className="text-[9px] font-bold text-slate-500 uppercase">Density (/km²)</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Base Map Toggle */}
                        <div className="pt-1">
                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={showBaseMap}
                                        onChange={(e) => setShowBaseMap(e.target.checked)}
                                    />
                                    <div className={`w-8 h-4 rounded-full transition-colors duration-200 ${showBaseMap ? 'bg-[#00E261]' : 'bg-slate-300'}`} />
                                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${showBaseMap ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">
                                    Show Base Land Use Map
                                </span>
                            </label>
                        </div>

                        {/* Point Data Toggle */}
                        <div className="pb-1">
                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={showDataPoints}
                                        onChange={(e) => setShowDataPoints(e.target.checked)}
                                    />
                                    <div className={`w-8 h-4 rounded-full transition-colors duration-200 ${showDataPoints ? 'bg-[#00E261]' : 'bg-slate-300'}`} />
                                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${showDataPoints ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">
                                    Show Point Data Overlay
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Analytical Charts Area */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white relative z-10 p-4 gap-4">
                    {(!analyticalData || analyticalData.length === 0) ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-lg border-2 border-dashed border-slate-200">
                            {apiStatus === 'loading' ? (
                                <>
                                    <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#00E261] animate-spin mb-4" />
                                    <div className="text-[11px] font-bold text-[#0F2E20] uppercase tracking-widest">Awaiting Projections</div>
                                </>
                            ) : (
                                <div className="text-[11px] font-bold text-red-500 uppercase tracking-widest">Fallback UI: Data Unavailable</div>
                            )}
                        </div>
                    ) : primaryMetric !== 'Land Use' ? (
                        <>
                            <div className="flex-1 relative w-full border-2 border-dashed border-transparent overflow-hidden rounded-lg bg-slate-50">
                                <TimeSeriesStackedChart
                                    analyticalData={analyticalData}
                                    targetRegions={['AUSTRALIA']}
                                    selectedSubCategory={selectedLandUse}
                                    selectedAgManagement={selectedAgManagement}
                                    title={`National ${primaryMetric} Projections`}
                                />
                            </div>
                            <div className="flex-1 relative w-full border-2 border-dashed border-transparent overflow-hidden rounded-lg bg-slate-50">
                                <TimeSeriesStackedChart
                                    analyticalData={analyticalData}
                                    targetRegions={selectedRegionIds.length > 0 ? selectedRegionIds : ['AUSTRALIA']}
                                    selectedSubCategory={selectedLandUse}
                                    selectedAgManagement={selectedAgManagement}
                                    title={`Regional ${primaryMetric} Performance`}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 w-full h-full overflow-y-auto space-y-4 pr-2 pb-4">
                            <div className="relative w-full h-[300px] border border-slate-200 rounded-lg bg-white shrink-0 p-2 shadow-sm">
                                <LandUseAreaChart
                                    analyticalData={analyticalData}
                                    targetRegions={['AUSTRALIA']}
                                    selectedSubCategory={selectedLandUse}
                                    selectedAgManagement={selectedAgManagement}
                                    title="National Land Use Trends"
                                />
                            </div>
                            <div className="relative w-full h-[300px] border border-slate-200 rounded-lg bg-white shrink-0 p-2 shadow-sm">
                                <LandUseAreaChart
                                    analyticalData={analyticalData}
                                    targetRegions={selectedRegionIds.length > 0 ? selectedRegionIds : ['AUSTRALIA']}
                                    selectedSubCategory={selectedLandUse}
                                    selectedAgManagement={selectedAgManagement}
                                    title="Regional Land Use Performance"
                                />
                            </div>
                            <div className="relative w-full h-[400px] border border-slate-200 rounded-lg bg-white shrink-0 p-2 shadow-sm">
                                <TransitionSankey
                                    analyticalData={analyticalData}
                                    targetRegions={selectedRegionIds.length > 0 ? selectedRegionIds : ['AUSTRALIA']}
                                    selectedYear={selectedYear}
                                    selectedSubCategory={selectedLandUse}
                                    title={`Land Use Flow/Transitions (2020 - ${selectedYear})`}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}