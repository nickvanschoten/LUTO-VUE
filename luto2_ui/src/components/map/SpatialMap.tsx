import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { Map as MapGL } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { WebMercatorViewport } from '@deck.gl/core';
import { useScenarioStore } from '../../store/useScenarioStore';
import { fetchSpatialData, fetchComparatorData } from '../../utils/api';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const INITIAL_VIEW_STATE = { longitude: 133.7751, latitude: -25.2744, zoom: 4, pitch: 0, bearing: 0 };

// Pure native numeric mapping logic circumventing huge JS libraries to model base sequential gradients 
function interpolateInferno(t: number) {
    if (t < 0.33) return [30 + t * 3 * 80, 20 + t * 3 * 40, 100 + t * 3 * 50];
    if (t < 0.66) return [110 + (t - .33) * 3 * 120, 60 + (t - .33) * 3 * 80, 150 - (t - .33) * 3 * 100];
    return [230 + (t - .66) * 3 * 25, 140 + (t - .66) * 3 * 115, 50 + (t - .66) * 3 * 50];
}

const CATEGORICAL_COLORS = [
    [34, 139, 34], [255, 140, 0], [70, 130, 180], [218, 112, 214],
    [244, 164, 96], [60, 179, 113], [255, 215, 0], [138, 43, 226]
];

export default function SpatialMap() {
    const {
        baseScenarioId, targetScenarioId, selectedYear, selectedVariables,
        setViewportBbox, viewportBbox, setIsFetchingSpatial, setColorScaleParams
    } = useScenarioStore();

    const [arrowTable, setArrowTable] = useState<any>(null);
    const [isComparisonMode, setIsComparisonMode] = useState(false);
    const [hoverInfo, setHoverInfo] = useState<any>(null);

    useEffect(() => { setIsComparisonMode(!!(baseScenarioId && targetScenarioId)); }, [baseScenarioId, targetScenarioId]);

    const onViewStateChange = useCallback(({ viewState }: any) => {
        const viewport = new WebMercatorViewport(viewState);
        const bounds = viewport.getBounds();
        setViewportBbox({ minLon: bounds[0], minLat: bounds[1], maxLon: bounds[2], maxLat: bounds[3] });
    }, [setViewportBbox]);

    useEffect(() => {
        if (!baseScenarioId || selectedVariables.length === 0) return;

        let delayDebounceFn: NodeJS.Timeout;
        delayDebounceFn = setTimeout(async () => {
            try {
                setIsFetchingSpatial(true);
                const bboxArray = viewportBbox ? [viewportBbox.minLon, viewportBbox.minLat, viewportBbox.maxLon, viewportBbox.maxLat] : undefined;
                let table;

                if (isComparisonMode && targetScenarioId) {
                    table = await fetchComparatorData(baseScenarioId, targetScenarioId, selectedYear, selectedVariables, bboxArray);
                } else {
                    table = await fetchSpatialData(baseScenarioId, selectedYear, selectedVariables, bboxArray);
                }

                setArrowTable(table);
            } catch (error) {
                console.error("Spatial Arrow fetch failed:", error);
            } finally {
                // Ensuring network locks resolve consistently independent of payload scale success failures.
                setIsFetchingSpatial(false);
            }
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [baseScenarioId, targetScenarioId, isComparisonMode, selectedYear, selectedVariables, viewportBbox, setIsFetchingSpatial]);

    const layers = useMemo(() => {
        if (!arrowTable) return [];

        const numRows = arrowTable.numRows;
        const targetVar = isComparisonMode ? `delta_${selectedVariables[0]}` : selectedVariables[0];

        const lonVector = arrowTable.getChild("longitude");
        const latVector = arrowTable.getChild("latitude");
        const valVector = arrowTable.getChild(targetVar);

        if (!lonVector || !latVector || !valVector) return [];

        const lonArray = lonVector.toArray();
        const latArray = latVector.toArray();
        const valArray = valVector.toArray();

        const positions = new Float32Array(numRows * 2);
        const colors = new Uint8Array(numRows * 4);

        const isCategorical = typeof valArray[0] === 'string';

        // Base loop intercepting Min/Max values or caching Categories natively to offset rendering boundaries 
        let domainMin = Infinity;
        let domainMax = -Infinity;
        const categoryMap = new Map<string, number[]>();
        const categoriesList: string[] = [];

        if (!isCategorical) {
            for (let i = 0; i < numRows; i++) {
                const v = valArray[i];
                if (v < domainMin) domainMin = v;
                if (v > domainMax) domainMax = v;
            }

            if (isComparisonMode && domainMin < 0 && domainMax > 0) {
                // Equalize divergence mapping bounds securely 
                const maxVal = Math.max(Math.abs(domainMin), Math.abs(domainMax));
                domainMin = -maxVal;
                domainMax = maxVal;
            }

            // Pass out scaling components to the UI layers completely bypassing React render loop collapses
            setTimeout(() => setColorScaleParams({ type: 'continuous', domainMin, domainMax }), 0);
        } else {
            let cIdx = 0;
            for (let i = 0; i < numRows; i++) {
                const v = valArray[i];
                if (!categoryMap.has(v)) {
                    categoryMap.set(v, CATEGORICAL_COLORS[cIdx % CATEGORICAL_COLORS.length]);
                    categoriesList.push(v);
                    cIdx++;
                }
            }
            setTimeout(() => setColorScaleParams({ type: 'categorical', categories: categoriesList }), 0);
        }

        // Secondary highly optimized flat array extraction executing GPU bound mapping colors
        for (let i = 0; i < numRows; i++) {
            positions[i * 2] = lonArray[i];
            positions[i * 2 + 1] = latArray[i];

            const val = valArray[i];
            let c = [100, 100, 100];

            if (isCategorical) {
                c = categoryMap.get(val as string) || [100, 100, 100];
            } else {
                if (isComparisonMode) {
                    // Diverging Mapping Protocol ensuring Red matches reduction logic / loss constraints 
                    if (val < 0) {
                        const t = Math.abs(val) / Math.abs(domainMin || 1);
                        c = [255, 255 - t * 255, 255 - t * 255];
                    } else {
                        const t = val / (domainMax || 1);
                        c = [255 - t * 255, 255, 255 - t * 255];
                    }
                } else {
                    const range = domainMax - domainMin;
                    const t = range === 0 ? 0.5 : (val - domainMin) / range;
                    c = interpolateInferno(t);
                }
            }

            colors[i * 4] = c[0];
            colors[i * 4 + 1] = c[1];
            colors[i * 4 + 2] = c[2];
            colors[i * 4 + 3] = 200;
        }

        return [
            new ScatterplotLayer({
                id: 'scenario-spatial-layer',
                data: {
                    length: numRows,
                    attributes: {
                        getPosition: { value: positions, size: 2 },
                        getFillColor: { value: colors, size: 4 }
                    }
                },
                getRadius: 1000,
                radiusMinPixels: 2,
                pickable: true,
                onHover: (info) => {
                    // Direct Array Address index referencing reconstructing Tooltips O(1) natively!
                    if (info.index !== -1) {
                        setHoverInfo({
                            x: info.x,
                            y: info.y,
                            lat: latArray[info.index],
                            lon: lonArray[info.index],
                            value: valArray[info.index],
                            metric: targetVar
                        });
                    } else {
                        setHoverInfo(null);
                    }
                }
            })
        ];
    }, [arrowTable, selectedVariables, isComparisonMode, setColorScaleParams]);

    return (
        <div className="w-full h-full relative" style={{ minHeight: '800px' }}>
            <DeckGL
                initialViewState={INITIAL_VIEW_STATE}
                controller={true}
                layers={layers}
                onViewStateChange={onViewStateChange}
            >
                <MapGL mapStyle={MAP_STYLE} reuseMaps />
            </DeckGL>

            {/* Extracted Native React Tooltip Component rendering explicitly utilizing index bounds instead of internal proxy iterations */}
            {hoverInfo && (
                <div
                    className="absolute z-50 bg-slate-900/95 text-white p-3 rounded-lg shadow-xl text-xs border border-slate-700 pointer-events-none transition-transform duration-75"
                    style={{ left: hoverInfo.x + 15, top: hoverInfo.y + 15 }}
                >
                    <div className="font-bold text-emerald-400 mb-1 tracking-wider uppercase">{hoverInfo.metric}</div>
                    <div className="font-mono text-slate-300 mb-2">Target Value: <span className="text-white text-sm">{typeof hoverInfo.value === 'number' ? hoverInfo.value.toFixed(4) : hoverInfo.value}</span></div>
                    <div className="flex gap-4 pt-2 border-t border-slate-700/50">
                        <div className="font-mono text-[10px] text-slate-500">Lat: {hoverInfo.lat.toFixed(4)}</div>
                        <div className="font-mono text-[10px] text-slate-500">Lon: {hoverInfo.lon.toFixed(4)}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
