"use client";

import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsSankey from 'highcharts/modules/sankey';
import HighchartsReact from 'highcharts-react-official';

if (typeof Highcharts === 'object') {
    HighchartsSankey(Highcharts);
}

interface Props {
    analyticalData: any[];
    targetRegions: string[];
    selectedYear: number;
    selectedSubCategory: string;
    baseYear: number;
    title?: string;
}

const TransitionSankey = ({ analyticalData, targetRegions, selectedYear, selectedSubCategory, baseYear, title }: Props) => {
    const chartData = useMemo(() => {
        if (!analyticalData || analyticalData.length === 0 || !targetRegions || targetRegions.length === 0) return [];
        try {
            const blob = Array.isArray(analyticalData) ? analyticalData[0] : analyticalData;

            const aggregatedDeltas: Record<string, number> = {};

            targetRegions.forEach(region => {
                const regionData = blob?.[region];
                if (!regionData) return;

                let rawSeries: any[] = [];
                if (Array.isArray(regionData)) {
                    rawSeries = regionData;
                } else if (typeof regionData === 'object') {
                    rawSeries = (regionData as any)['ALL'] || (regionData as any)[Object.keys(regionData)[0]] || [];
                }
                if (!Array.isArray(rawSeries)) return;

                rawSeries.forEach(s => {
                    if (!s || !Array.isArray(s.data) || s.data.length === 0) return;

                    const pBase = s.data.find((p: any) => p[0] === baseYear);
                    const pSelected = s.data.find((p: any) => p[0] === selectedYear);

                    const baseVal = pBase ? Number(pBase[1]) : NaN;
                    const endVal = pSelected ? Number(pSelected[1]) : NaN;

                    if (isNaN(baseVal) || isNaN(endVal)) return;

                    const delta = endVal - baseVal;
                    if (Math.abs(delta) < 0.01) return;

                    aggregatedDeltas[s.name] = (aggregatedDeltas[s.name] || 0) + delta;
                });
            });

            const links: any[] = [];

            Object.entries(aggregatedDeltas).forEach(([name, delta]) => {
                // State Filtering
                if (selectedSubCategory && selectedSubCategory !== 'ALL') {
                    if (name !== selectedSubCategory) return;
                }

                if (Math.abs(delta) < 0.01) return;

                let fromNode: string;
                let toNode: string;

                if (delta < 0) {
                    fromNode = `${baseYear} ${name}`;
                    toNode = `Transitioned Away`;
                } else {
                    fromNode = `Newly Established`;
                    toNode = `${selectedYear} ${name}`;
                }

                const weight = Math.abs(delta);
                if (weight > 0 && fromNode !== toNode) {
                    links.push({
                        from: fromNode,
                        to: toNode,
                        weight,
                        color: delta > 0 ? 'rgba(0, 226, 97, 0.4)' : 'rgba(239, 68, 68, 0.4)'
                    });
                }
            });
            console.log('Sankey Links Array:', links);
            return links;
        } catch (e) {
            console.warn('Sankey extraction failed:', e);
            return [];
        }
    }, [analyticalData, targetRegions, selectedYear, selectedSubCategory, baseYear]);

    const options = useMemo<Highcharts.Options>(() => ({
        chart: {
            backgroundColor: 'transparent',
            style: { fontFamily: 'inherit' },
            spacing: [15, 15, 15, 15]
        },
        title: {
            text: title || `Land Use Flow (${selectedYear})`,
            align: 'left',
            style: { fontSize: '13px', fontWeight: 'bold', color: '#64748b' }
        },
        credits: { enabled: false },
        tooltip: {
            pointFormat: '{point.fromNode.name} → {point.toNode.name}: <b>{point.weight:,.2f}</b>',
        },
        series: [{
            keys: ['from', 'to', 'weight'],
            data: chartData,
            type: 'sankey',
            name: 'Land Use Transitions'
        } as any]
    }), [chartData, selectedYear, title]);

    if (chartData.length === 0) {
        return (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-50/50 rounded-lg">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center px-4">
                    No transition data available for {targetRegions.join(', ')} ({baseYear} - {selectedYear}) {selectedSubCategory !== 'ALL' ? `(${selectedSubCategory})` : ''}
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 w-full h-full">
            <HighchartsReact
                highcharts={Highcharts}
                options={options}
                containerProps={{ className: 'w-full h-full' }}
            />
        </div>
    );
};

export default React.memo(TransitionSankey);
