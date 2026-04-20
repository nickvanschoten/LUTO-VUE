"use client";

import React, { useEffect, useState, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import { BitmapLayer } from '@deck.gl/layers';
import { Map as MapGL } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import useDashboardStore from '@/store/useDashboardStore';
import { Download, Map as MapIcon } from 'lucide-react';
import { exportChoroplethToCSV } from '../utils/exportUtils';
import { VRE_INFRASTRUCTURE_LIST, EXCLUDED_MAP_REGIONS, NRM_TO_STATE_MAP } from '@/utils/constants';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const INITIAL_VIEW_STATE = { longitude: 133.7751, latitude: -25.2744, zoom: 4.5, pitch: 0, bearing: 0 };

// Fallback bounds in DeckGL format [minLon, minLat, maxLon, maxLat]
const AUSTRALIA_BOUNDS: [number, number, number, number] = [112.925, -43.665, 153.625, -10.015];

interface Props {
    geoData?: any;
    analyticalData: any[];
    mapProxyData?: any[] | null;
    primaryMetric: string;
    selectedSubCategory?: string;
    selectedYear?: number;
    showBaseMap?: boolean;
    showDataPoints?: boolean;
    showChoropleth?: boolean;
    choroplethMode?: 'total' | 'density';
    selectedAgManagement?: string;
    isVREMode?: boolean;
}

// Compact number formatter for the legend
function fmtNum(n: number, isVRE: boolean = false): string {
    const abs = Math.abs(n);
    if (isVRE) {
        if (abs >= 1000000) return (n / 1000000).toFixed(0) + ' TWh';
        if (abs >= 1000) return (n / 1000).toFixed(0) + ' GWh';
        return n.toFixed(0) + ' MWh';
    }
    if (abs >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'k';
    return n.toFixed(1);
}

const MapHub = ({
    geoData,
    analyticalData = [],
    mapProxyData = null,
    primaryMetric = '',
    selectedSubCategory = 'ALL',
    selectedYear = 2050,
    showBaseMap = false,
    showDataPoints = false,
    showChoropleth = true,
    choroplethMode = 'total',
    selectedAgManagement = 'ALL',
    isVREMode = false,
}: Props) => {
    const { selectedRegionIds, setSelectedRegionIds, areaDict, selectedScenario } = useDashboardStore();

    // Raster overlay states
    const [rasterBaseImgStr, setRasterBaseImgStr] = useState<string | null>(null);
    const [rasterBaseBounds, setRasterBaseBounds] = useState<[number, number, number, number]>(AUSTRALIA_BOUNDS);
    const [rasterBaseOverlayUrl, setRasterBaseOverlayUrl] = useState<string | null>(null);

    const [rasterDataImgStr, setRasterDataImgStr] = useState<string | null>(null);
    const [rasterDataBounds, setRasterDataBounds] = useState<[number, number, number, number]>(AUSTRALIA_BOUNDS);
    const [rasterDataOverlayUrl, setRasterDataOverlayUrl] = useState<string | null>(null);

    // ── Base Raster Fetch ───────────────────────────
    useEffect(() => {
        if (!primaryMetric || !showBaseMap) return;
        // Sentinel: wait for a scenario to be active before hitting the map-layer API
        if (!selectedScenario) return;
        let cancelled = false;

        const fetchBaseRaster = async () => {
            try {
                const params = new URLSearchParams({
                    scenario: selectedScenario,
                    metric: primaryMetric,
                    subCat: 'ALL',
                    year: String(selectedYear),
                });
                const res = await fetch(`/api/map-layer?${params.toString()}`);
                if (!res.ok) {
                    if (!cancelled) setRasterBaseImgStr(null);
                    return;
                }
                let json;
                try {
                    const text = await res.text();
                    json = JSON.parse(text);
                } catch (parseError) {
                    console.warn('Raster Base JSON Parse Error:', parseError);
                    if (!cancelled) setRasterBaseImgStr(null);
                    return;
                }
                if (cancelled) return;

                // Fix the Base64 String for Base Map
                if (json.empty || !json.img_str) {
                    setRasterBaseImgStr(null);
                } else {
                    const prefix = 'data:image/png;base64,';
                    const finalImgStr = json.img_str.startsWith('data:')
                        ? json.img_str
                        : prefix + json.img_str;
                    setRasterBaseImgStr(finalImgStr);
                }

                if (json.bounds && Array.isArray(json.bounds) && json.bounds.length === 2) {
                    const [[lat0, lon0], [lat1, lon1]] = json.bounds;
                    setRasterBaseBounds([lon0, lat0, lon1, lat1]);
                }
            } catch (e) {
                if (!cancelled) setRasterBaseImgStr(null);
            }
        };

        fetchBaseRaster();
        return () => { cancelled = true; };
    }, [primaryMetric, selectedYear, showBaseMap, selectedScenario]);

    // ── Data Points Raster Fetch ───────────────────────────
    useEffect(() => {
        if (!primaryMetric || !showDataPoints || (selectedSubCategory === 'ALL' && (!selectedAgManagement || selectedAgManagement === 'ALL'))) return;
        // Sentinel: wait for a scenario to be active before hitting the map-layer API
        if (!selectedScenario) return;
        let cancelled = false;

        const fetchDataRaster = async () => {
            try {
                // Determine the correct parent metric to send to the backend.
                // Apply the exact same VRE interceptor logic so we don't blindly request 'Production' or 'Land Use'
                const targetFilter = (selectedAgManagement && selectedAgManagement !== 'ALL') ? selectedAgManagement : selectedSubCategory;
                const isInfra = VRE_INFRASTRUCTURE_LIST.includes(targetFilter.toLowerCase());

                const finalMetric = isInfra ? 'Renewable Energy' : primaryMetric;

                const params = new URLSearchParams({
                    metric: finalMetric,
                    parentCat: selectedSubCategory === 'ALL' ? 'ALL' : selectedSubCategory,
                    subCat: selectedAgManagement !== 'ALL' ? selectedAgManagement : 'ALL',
                    year: String(selectedYear),
                    scenario: selectedScenario
                });

                const url = `/api/map-layer?${params.toString()}`;
                console.log("Fetching Raster (Deep Traversal):", url);

                const res = await fetch(url);
                if (!res.ok) {
                    if (!cancelled) setRasterDataImgStr(null);
                    return;
                }

                let json;
                try {
                    const text = await res.text();
                    json = JSON.parse(text);
                } catch (parseError) {
                    console.warn('Raster Data JSON Parse Error:', parseError);
                    if (!cancelled) setRasterDataImgStr(null);
                    return;
                }

                if (cancelled) return;

                // Fix the Base64 String for Image Source
                if (json.empty || !json.img_str) {
                    setRasterDataImgStr(null);
                } else {
                    const prefix = 'data:image/png;base64,';
                    const finalImgStr = json.img_str.startsWith('data:')
                        ? json.img_str
                        : prefix + json.img_str;
                    setRasterDataImgStr(finalImgStr);
                }

                if (json.bounds && Array.isArray(json.bounds) && json.bounds.length === 2) {
                    const [[lat0, lon0], [lat1, lon1]] = json.bounds;
                    setRasterDataBounds([lon0, lat0, lon1, lat1]);
                }
            } catch (e: any) {
                console.warn(`Raster Fetch Failed for [${selectedSubCategory}]:`, e);
                if (!cancelled) setRasterDataImgStr(null);
            }
        };

        fetchDataRaster();
        return () => { cancelled = true; };
    }, [primaryMetric, selectedSubCategory, selectedYear, showDataPoints, selectedAgManagement, selectedScenario]);

    // Clear rasters when toggled off
    useEffect(() => {
        if (!showBaseMap) setRasterBaseImgStr(null);
    }, [showBaseMap]);

    useEffect(() => {
        if (!showDataPoints || (selectedSubCategory === 'ALL' && (!selectedAgManagement || selectedAgManagement === 'ALL'))) setRasterDataImgStr(null);
    }, [showDataPoints, selectedSubCategory, selectedAgManagement]);

    // Canvas Generators
    useEffect(() => {
        if (!rasterBaseImgStr) {
            setRasterBaseOverlayUrl(null);
            return;
        }
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                setRasterBaseOverlayUrl(canvas.toDataURL());
            }
        };
        img.onerror = (err) => {
            console.error("Canvas failed to load Base Raster Base64 Image:", err);
        };
        img.src = rasterBaseImgStr;
    }, [rasterBaseImgStr]);

    useEffect(() => {
        if (!rasterDataImgStr) {
            setRasterDataOverlayUrl(null);
            return;
        }
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                setRasterDataOverlayUrl(canvas.toDataURL());
            }
        };
        img.onerror = (err) => {
            console.error("Canvas failed to load Data Raster Base64 Image:", err);
        };
        img.src = rasterDataImgStr;
    }, [rasterDataImgStr]);

    // ── Choropleth data dictionary ─────────────────────────────────────────
    const { dataDict, minVal, maxVal } = useMemo(() => {
        if (!analyticalData || analyticalData.length === 0 || !primaryMetric) {
            return { dataDict: {} as Record<string, number>, minVal: 0, maxVal: 1 };
        }

        const dict: Record<string, number> = {};
        let min = Infinity;
        let max = -Infinity;
        const targetFilter = (selectedAgManagement && selectedAgManagement !== 'ALL')
            ? selectedAgManagement
            : selectedSubCategory;
        const isVRE = VRE_INFRASTRUCTURE_LIST.includes(targetFilter.toLowerCase());
        const isProxyMode = primaryMetric === 'Production' && isVRE && !!(mapProxyData && mapProxyData.length > 0);

        // --- Spatial Downscaling Engine (VRE Production Override) ---
        if (isProxyMode) {
            // Step A: Calculate Total State Land Use
            const stateLandUseTotals: Record<string, number> = {};
            const nrmLandUseDict: Record<string, number> = {};
            const proxyBlob = mapProxyData![0];

            if (proxyBlob) {
                Object.keys(proxyBlob).forEach(regionKey => {
                    const safeRegion = regionKey.trim().toLowerCase();
                    if (EXCLUDED_MAP_REGIONS.includes(safeRegion)) return;

                    const stateName = NRM_TO_STATE_MAP[safeRegion];
                    if (!stateName) return; // Skip unmapped regions

                    const val = proxyBlob[regionKey];
                    if (typeof val === 'number' && !isNaN(val)) {
                        nrmLandUseDict[safeRegion] = val;
                        stateLandUseTotals[stateName] = (stateLandUseTotals[stateName] || 0) + val;
                    }
                });
            }

            // Step B: Extract State Production Totals
            const stateProdTotals: Record<string, number> = {};
            const prodBlob = analyticalData[0];
            if (prodBlob) {
                Object.keys(prodBlob).forEach(regionKey => {
                    const safeRegion = regionKey.trim().toLowerCase();
                    if (EXCLUDED_MAP_REGIONS.includes(safeRegion) && safeRegion !== 'australia' && safeRegion !== 'other territories') {
                        const rawSeries: any[] = Array.isArray(prodBlob[regionKey]) ? prodBlob[regionKey] : [];
                        const matchedSeries = rawSeries.filter((s: any) => {
                            if (s.name && s.name.toLowerCase() === targetFilter.toLowerCase()) return true;
                            if (s._agManagement && s._agManagement.toLowerCase() === targetFilter.toLowerCase()) return true;
                            return false;
                        });

                        let val = NaN;
                        matchedSeries.forEach(s => {
                            if (s && Array.isArray(s.data)) {
                                const dataPoint = s.data.find((p: any) => Number(p[0]) === Number(selectedYear));
                                if (dataPoint) val = (isNaN(val) ? 0 : val) + Number(dataPoint[1]);
                            }
                        });
                        if (!isNaN(val)) stateProdTotals[safeRegion] = val;
                    }
                });
            }

            // Step C & D: Apply Downscaling Formula
            Object.keys(nrmLandUseDict).forEach(nrmRegion => {
                const state = NRM_TO_STATE_MAP[nrmRegion];
                const nrmLandUse = nrmLandUseDict[nrmRegion] || 0;
                const totalStateLandUse = stateLandUseTotals[state] || 0;
                const stateProd = stateProdTotals[state];

                let estimatedProd = 0;
                if (totalStateLandUse > 0 && stateProd !== undefined && !isNaN(stateProd)) {
                    estimatedProd = (nrmLandUse / totalStateLandUse) * stateProd;
                }

                if (state === 'victoria') {
                    console.log(`DOWNSCALE TRACE [${nrmRegion}]:`, {
                        nrmLand: nrmLandUse,
                        stateLandTotal: totalStateLandUse,
                        stateProdTotal: stateProd,
                        calculatedProd: estimatedProd
                    });
                }

                // Final assignment with density modifier support
                let finalVal = estimatedProd;
                if (choroplethMode === 'density') {
                    const area = areaDict[nrmRegion] || 1;
                    finalVal = finalVal / area;
                }

                dict[nrmRegion] = finalVal;
                min = Math.min(min, finalVal);
                max = Math.max(max, finalVal);
            });

            return { dataDict: dict, minVal: min === Infinity ? 0 : min, maxVal: max === -Infinity ? 1 : max };
        }
        // --- End Spatial Downscaling Engine ---

        const blob = Array.isArray(analyticalData) ? analyticalData[0] : analyticalData;
        if (!blob) return { dataDict: dict, minVal: 0, maxVal: 1 };

        // Defensive iteration: handle both array-of-region-objects and object keyed by region name
        const regionEntries: Array<{ name: string; data: any }> = [];
        if (Array.isArray(blob)) {
            blob.forEach((item: any) => {
                const name = typeof item === 'string' ? item
                    : (item.region || item.NRM_REGION || item.name || null);
                if (name) regionEntries.push({ name, data: item });
            });
        } else {
            Object.keys(blob).forEach(key => {
                regionEntries.push({ name: key, data: blob[key] });
            });
        }

        regionEntries.forEach(({ name: region, data: regionData }) => {
            if (!region) return;
            const safeRegion = region.trim().toLowerCase();

            if (EXCLUDED_MAP_REGIONS.includes(safeRegion)) return;

            if (!regionData) {
                dict[safeRegion] = 0; // Graceful fallback for missing regional JSON data
                return;
            }

            let rawSeries: any[] = [];

            if (Array.isArray(regionData)) {
                rawSeries = regionData;
            } else if (regionData && typeof regionData === 'object') {
                rawSeries = (regionData as any)['ALL'] || (regionData as any)[Object.keys(regionData)[0]] || [];
            }
            if (!Array.isArray(rawSeries) || rawSeries.length === 0) {
                dict[safeRegion] = 0; // Graceful fallback for missing regional JSON data
                return;
            }

            // Case-insensitive match to bridge UI strings to Python backend strings
            const targetFilter = (selectedAgManagement && selectedAgManagement !== 'ALL')
                ? selectedAgManagement
                : selectedSubCategory;

            // Find all matching series to support Production Bypass aggregation
            const matchedSeries = rawSeries.filter((s: any) => {
                if (targetFilter && targetFilter !== 'ALL') {
                    if (s.name && s.name.toLowerCase() === targetFilter.toLowerCase()) return true;
                    if (s._agManagement && s._agManagement.toLowerCase() === targetFilter.toLowerCase()) return true;

                    // Production Bypass
                    if (primaryMetric === 'Production') {
                        const isInfra = VRE_INFRASTRUCTURE_LIST.includes(targetFilter.toLowerCase());
                        if (isInfra && s._agManagement && s._agManagement.toLowerCase() === targetFilter.toLowerCase()) return true;
                    }
                    return false;
                }
                return true; // if ALL, maybe just take the first or sum? Actually, if targetFilter === 'ALL', MapHub historically just took rawSeries[0]
            });

            // If ALL, emulate legacy behaviour
            const seriesToProcess = (targetFilter && targetFilter !== 'ALL') ? matchedSeries : [rawSeries[0]];

            // If we found NO matching series (e.g. they only have missing data for this infrastructure locally)
            if (seriesToProcess.length === 0) {
                dict[safeRegion] = 0;
                return;
            }

            let val = NaN;
            seriesToProcess.forEach(s => {
                if (s && Array.isArray(s.data)) {
                    // Type-agnostic year matching: Number(p[0]) === Number(selectedYear)
                    const dataPoint = s.data.find((p: any) => Number(p[0]) === Number(selectedYear));
                    if (dataPoint) {
                        val = (isNaN(val) ? 0 : val) + Number(dataPoint[1]);
                    }
                }
            });

            if (!isNaN(val)) {
                // Normalise key for case-insensitive GeoJSON matching
                const safeRegion = region.trim().toLowerCase();

                let finalVal = val;
                if (choroplethMode === 'density') {
                    const area = areaDict[safeRegion] || 1;
                    // Safely ignore warning if val is explicitly 0 (often implies missing backend raster fallback context)
                    if (area === 1 && val !== 0 && finalVal !== 0) console.warn(`GeoJSON missing area property for density calculation: ${safeRegion}`);
                    finalVal = val / area;
                }

                dict[safeRegion] = finalVal;
                if (finalVal < min) min = finalVal;
                if (finalVal > max) max = finalVal;
            }
        });

        return {
            dataDict: dict,
            minVal: min === Infinity ? 0 : min,
            maxVal: max === -Infinity ? 1 : max,
        };
    }, [analyticalData, primaryMetric, selectedSubCategory, selectedYear, choroplethMode, areaDict]);

    const hasData = Object.keys(dataDict).length > 0;

    // ── Build layers ───────────────────────────────────────────────────────
    const layers = useMemo(() => {
        const result: any[] = [];

        // 1. BitmapLayer Base Map (BELOW — first in array), only when toggle is on
        if (showBaseMap && rasterBaseOverlayUrl) {
            result.push(new BitmapLayer({
                id: 'raster-overlay-base',
                bounds: rasterBaseBounds,
                image: rasterBaseOverlayUrl,
                opacity: 0.6,
                updateTriggers: {
                    image: [showBaseMap, primaryMetric, selectedYear],
                    bounds: [primaryMetric, selectedYear]
                }
            }));
        }

        // 1.5 BitmapLayer Data Points
        if (showDataPoints && rasterDataOverlayUrl) {
            result.push(new BitmapLayer({
                id: 'raster-overlay-data',
                bounds: rasterDataBounds,
                image: rasterDataOverlayUrl,
                opacity: 0.8,
                updateTriggers: {
                    image: [showDataPoints, primaryMetric, selectedSubCategory, selectedYear],
                    bounds: [primaryMetric, selectedSubCategory, selectedYear]
                }
            }));
        }

        // 2. GeoJsonLayer (on top)
        if (geoData && showChoropleth) {
            console.log("CHOROPLETH DICT:", dataDict);
            result.push(new GeoJsonLayer({
                id: 'nrm-regions-layer',
                data: geoData,
                pickable: true,
                stroked: true,
                filled: true,
                lineWidthMinPixels: 1.5,
                getFillColor: (f: any) => {
                    const regionName = f.properties.NRM_REGION?.trim().toLowerCase();
                    const val = dataDict[regionName];

                    if (val === undefined) return [50, 50, 50, 60];

                    const blob = Array.isArray(analyticalData) ? analyticalData[0] : analyticalData;
                    const exactDataKey = blob ? (Object.keys(blob).find(k => k.toLowerCase() === regionName) || f.properties.NRM_REGION) : f.properties.NRM_REGION;

                    if (selectedRegionIds.includes(exactDataKey)) return [0, 226, 97, 200];

                    const absPeak = Math.max(Math.abs(minVal), Math.abs(maxVal)) || 1;
                    const ratio = Math.abs(val) / absPeak;
                    const intensity = Math.floor(ratio * 200);

                    return val < 0
                        ? [255, 255 - intensity, 255 - intensity, 120]
                        : [255 - intensity, 255, 255 - intensity, 120];
                },
                getLineColor: (f: any) => {
                    const clickedRegion = f.properties.NRM_REGION?.trim().toLowerCase();
                    const blob = Array.isArray(analyticalData) ? analyticalData[0] : analyticalData;
                    const exactDataKey = blob ? (Object.keys(blob).find(k => k.toLowerCase() === clickedRegion) || f.properties.NRM_REGION) : f.properties.NRM_REGION;

                    return selectedRegionIds.includes(exactDataKey) ? [0, 255, 255, 255] : [255, 255, 255, 60];
                },
                getLineWidth: (f: any) => {
                    const clickedRegion = f.properties.NRM_REGION?.trim().toLowerCase();
                    const blob = Array.isArray(analyticalData) ? analyticalData[0] : analyticalData;
                    const exactDataKey = blob ? (Object.keys(blob).find(k => k.toLowerCase() === clickedRegion) || f.properties.NRM_REGION) : f.properties.NRM_REGION;

                    return selectedRegionIds.includes(exactDataKey) ? 3000 : 500;
                },
                onClick: (info: any, event: any) => {
                    if (info.object) {
                        const region = info.object.properties.NRM_REGION?.trim().toLowerCase();
                        if (!region) return;

                        // Find the exact matching key from the analytical data blob (Title Case)
                        const blob = Array.isArray(analyticalData) ? analyticalData[0] : analyticalData;
                        const exactDataKey = blob ? (Object.keys(blob).find(k => k.toLowerCase() === region) || info.object.properties.NRM_REGION) : info.object.properties.NRM_REGION;

                        const isMulti = event.srcEvent.ctrlKey || event.srcEvent.metaKey;
                        if (isMulti) {
                            const newSelection = selectedRegionIds.includes(exactDataKey)
                                ? selectedRegionIds.filter(id => id !== exactDataKey)
                                : [...selectedRegionIds, exactDataKey];
                            setSelectedRegionIds(newSelection);
                        } else {
                            setSelectedRegionIds([exactDataKey]);
                        }
                    } else {
                        setSelectedRegionIds([]);
                    }
                },
                updateTriggers: {
                    getFillColor: [dataDict, selectedRegionIds, choroplethMode, areaDict],
                    getLineColor: [selectedRegionIds],
                }
            }));
        }

        return result;
    }, [geoData, showChoropleth, showBaseMap, rasterBaseOverlayUrl, rasterBaseBounds, showDataPoints, rasterDataOverlayUrl, rasterDataBounds, dataDict, minVal, maxVal, selectedRegionIds, setSelectedRegionIds]);

    const handleGeoTIFFDownload = () => {
        if (!selectedScenario) return;
        const params = new URLSearchParams({
            scenario: selectedScenario,
            metric: primaryMetric,
            parentCat: selectedSubCategory === 'ALL' ? 'ALL' : selectedSubCategory,
            subCat: selectedAgManagement !== 'ALL' ? selectedAgManagement : 'ALL',
            year: String(selectedYear),
        });
        window.location.href = `http://127.0.0.1:8000/api/v1/export/geotiff?${params.toString()}`;
    };

    return (
        <div className="relative w-full h-full min-h-0 bg-slate-900 border-none overflow-hidden group">
            {/* Export Actions */}
            <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => exportChoroplethToCSV(dataDict, selectedYear, `LUTO_Regional_${primaryMetric}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-[#00E261] rounded shadow border border-slate-700 transition-colors"
                    title="Download Choropleth Data (CSV)"
                >
                    <Download size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">CSV</span>
                </button>
                <button
                    onClick={handleGeoTIFFDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-[#00E261] rounded shadow border border-slate-700 transition-colors"
                    title="Download Cell-Level GeoTIFF"
                >
                    <MapIcon size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">TIFF</span>
                </button>
            </div>

            {/* Choropleth Legend */}
            {hasData && (
                <div className="absolute bottom-4 left-4 z-10 pointer-events-none bg-slate-900/80 backdrop-blur-sm rounded-lg p-3 min-w-[160px]">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                        {primaryMetric} {choroplethMode === 'density' ? '(Density)' : ''} — {selectedYear}
                    </p>
                    <div
                        className="w-full h-2.5 rounded-full mb-1.5"
                        style={{ background: 'linear-gradient(to right, rgb(255,80,80), rgb(80,80,80), rgb(80,255,80))' }}
                    />
                    <div className="flex justify-between text-[9px] font-bold text-slate-300">
                        <span>{fmtNum(minVal, isVREMode)}</span>
                        <span className="text-slate-500">0</span>
                        <span>{fmtNum(maxVal, isVREMode)}</span>
                    </div>
                </div>
            )}

            {/* Raster Legend — only when high-res overlay is active */}
            {(showBaseMap || showDataPoints) && (rasterBaseImgStr || rasterDataImgStr) && (
                <div className="absolute bottom-24 left-4 z-10 pointer-events-none bg-slate-900/80 backdrop-blur-sm rounded-lg p-3 min-w-[160px]">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#00E261] mb-2">
                        {showDataPoints && showBaseMap ? 'Base Map & Point Data' : showDataPoints ? 'High-Res Point Data' : 'High-Res Base Map'}
                    </p>
                    <div className="space-y-1">
                        {[
                            { label: 'Dryland Cropping', color: '#f59e0b' },
                            { label: 'Irrigated Cropping', color: '#3b82f6' },
                            { label: 'Grazing (Ag)', color: '#84cc16' },
                            { label: 'Agroforestry / Am', color: '#a855f7' },
                            { label: 'Environmental / NonAg', color: '#22c55e' },
                            { label: 'No Data', color: '#475569' },
                        ].map(entry => (
                            <div key={entry.label} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                <span className="text-[9px] text-slate-300 leading-tight">{entry.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <DeckGL
                initialViewState={INITIAL_VIEW_STATE}
                controller={true}
                layers={layers}
                getTooltip={({ object }: any) => {
                    if (!object?.properties) return null;
                    const rawName = object.properties.NRM_REGION;
                    const regionName = rawName ? rawName.trim().toLowerCase() : '';
                    const val = dataDict[regionName];
                    if (val === undefined) {
                        return `NRM Region: "${rawName}"\nStatus: Not found in analytical data keys.`;
                    }

                    const area = areaDict[regionName];
                    const displayArea = area ? `${area.toFixed(0)} km²` : 'Unknown Area';

                    let formattedVal = '';
                    if (isVREMode) {
                        const absVal = Math.abs(val);
                        if (absVal >= 1000000) {
                            formattedVal = (val / 1000000).toFixed(2) + ' TWh';
                        } else if (absVal >= 1000) {
                            formattedVal = (val / 1000).toFixed(2) + ' GWh';
                        } else {
                            formattedVal = val.toLocaleString() + ' MWh';
                        }
                    } else {
                        formattedVal = Math.abs(val) >= 1e6
                            ? (val / 1e6).toFixed(2) + 'M'
                            : Math.abs(val) >= 1e3
                                ? (val / 1e3).toFixed(2) + 'k'
                                : val.toFixed(2);
                    }

                    return `${rawName}\nValue: ${formattedVal} ${choroplethMode === 'density' ? '/ km²' : ''}\nArea: ${displayArea}`.trim();
                }}
            >
                <MapGL mapStyle={MAP_STYLE} reuseMaps />
            </DeckGL>
        </div>
    );
};

export default React.memo(MapHub);