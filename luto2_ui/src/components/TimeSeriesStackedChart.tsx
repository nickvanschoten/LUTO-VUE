"use client";

import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface Props {
    analyticalData: any[];
    targetRegions: string[];
    selectedSubCategory: string;
    selectedAgManagement: string;
    primaryMetric?: string;
    title?: string;
}

const COMMODITY_GROUPS: Record<string, string> = {
    'Hay': 'Cropping', 'Summer cereals': 'Cropping', 'Summer legumes': 'Cropping', 'Summer oilseeds': 'Cropping', 'Winter cereals': 'Cropping', 'Winter legumes': 'Cropping', 'Winter oilseeds': 'Cropping',
    'Cotton': 'Intensive Cropping', 'Other non-cereal crops': 'Intensive Cropping', 'Rice': 'Intensive Cropping', 'Sugar': 'Intensive Cropping', 'Vegetables': 'Intensive Cropping',
    'Apples': 'Horticulture', 'Citrus': 'Horticulture', 'Grapes': 'Horticulture', 'Nuts': 'Horticulture', 'Pears': 'Horticulture', 'Plantation fruit': 'Horticulture', 'Stone fruit': 'Horticulture', 'Tropical stone fruit': 'Horticulture',
    'Unallocated - modified land': 'Unallocated', 'Unallocated - natural land': 'Unallocated',
    'Beef - modified land': 'Livestock', 'Sheep - modified land': 'Livestock', 'Dairy - modified land': 'Livestock', 'Beef - natural land': 'Livestock', 'Sheep - natural land': 'Livestock', 'Dairy - natural land': 'Livestock'
};

const TimeSeriesStackedChart = ({ analyticalData, targetRegions, selectedSubCategory, selectedAgManagement, primaryMetric, title }: Props) => {
    const chartSeries = useMemo(() => {
        if (!analyticalData || analyticalData.length === 0 || !targetRegions || targetRegions.length === 0) return [];
        try {
            const blob = Array.isArray(analyticalData) ? analyticalData[0] : analyticalData;

            const groupedSeriesObj: Record<string, any> = {};

            targetRegions.forEach(region => {
                const regionData = blob?.[region];
                if (!regionData) return;

                let rawSeries: any[] = [];
                // 1. Safe Extraction
                if (Array.isArray(regionData)) {
                    rawSeries = regionData;
                } else if (typeof regionData === 'object') {
                    rawSeries = (regionData as any)['ALL'] || (regionData as any)[Object.keys(regionData)[0]] || [];
                }
                if (!Array.isArray(rawSeries)) return;

                // 2. State Filtering (and Overlay Hard-Purge)
                const filteredSeries = rawSeries.filter((s: any) => {
                    // 1. Standard Cleanup
                    if (!s.name || s.name.toLowerCase().includes('agricultural management')) return false;

                    // 2. Production Bypass: If we are in Production and examining the renewable file,
                    // we bypass the strict tech check because the tech string isn't in the file.
                    const isInfrastructureMain = [
                        'onshore wind', 'utility solar pv', 'human-induced regeneration (beef)',
                        'human-induced regeneration (sheep)', 'savanna burning', 'environmental plantings'
                    ].includes((selectedAgManagement || '').toLowerCase());
                    
                    if (primaryMetric === 'Production' && isInfrastructureMain && s._agManagement && s._agManagement.toLowerCase() === (selectedAgManagement || '').toLowerCase()) {
                        return true; // Render the aggregated renewable production commodities
                    }

                    // 3. Standard Filtering for Land Use / Area
                    const matchesSubCat = selectedSubCategory === 'ALL' || !selectedSubCategory || s.name.toLowerCase() === selectedSubCategory.toLowerCase();
                    const matchesAgMgmt = selectedAgManagement === 'ALL' || !selectedAgManagement ||
                        (s._agManagement && s._agManagement.toLowerCase() === selectedAgManagement.toLowerCase()) ||
                        (s.name.toLowerCase() === selectedAgManagement.toLowerCase());

                    return matchesSubCat && matchesAgMgmt;
                });

                if (!Array.isArray(filteredSeries)) return;

                // 3. Commodity Grouping & Consolidation
                filteredSeries.forEach((series: any) => {
                    if (!series || !Array.isArray(series.data)) return;
                    const groupName = COMMODITY_GROUPS[series.name] || series.name;

                    if (!groupedSeriesObj[groupName]) {
                        // Deep copy tuples
                        groupedSeriesObj[groupName] = {
                            name: groupName,
                            type: 'area',
                            data: series.data.map((tuple: any) => [...tuple])
                        };
                    } else {
                        // Safe accumulation values matching precisely by year
                        series.data.forEach((tuple: any, index: number) => {
                            if (groupedSeriesObj[groupName].data[index] && groupedSeriesObj[groupName].data[index][0] === tuple[0]) {
                                const currentVal = groupedSeriesObj[groupName].data[index][1];
                                const newVal = tuple[1];
                                groupedSeriesObj[groupName].data[index][1] = (Number(currentVal) || 0) + (Number(newVal) || 0);
                            }
                        });
                    }
                });
            });

            return Object.values(groupedSeriesObj);
        } catch (e) {
            console.warn('Series extraction failed:', e);
            return [];
        }
    }, [analyticalData, targetRegions, selectedSubCategory, selectedAgManagement, primaryMetric]);

    const options = useMemo<Highcharts.Options>(() => ({
        chart: {
            backgroundColor: 'transparent',
            style: { fontFamily: 'inherit' },
            spacing: [15, 15, 15, 15]
        },
        title: {
            text: title || '',
            align: 'left',
            style: { fontSize: '13px', fontWeight: 'bold', color: '#64748b' }
        },
        credits: { enabled: false },
        legend: {
            enabled: true,
            align: 'center',
            verticalAlign: 'bottom',
            itemStyle: { fontSize: '10px', color: '#64748b', fontWeight: '500' }
        },
        plotOptions: {
            area: {
                stacking: 'normal',
                marker: { enabled: false },
                lineWidth: 1
            }
        },
        xAxis: {
            tickmarkPlacement: 'on',
            title: { text: undefined }
        },
        yAxis: {
            title: { text: '' },
            labels: {
                style: { color: '#94a3b8' },
                formatter: function () {
                    let val = Math.abs(this.value as number);
                    if (val >= 1e9) return ((this.value as number) / 1e9).toFixed(1) + 'B';
                    if (val >= 1e6) return ((this.value as number) / 1e6).toFixed(1) + 'M';
                    if (val >= 1e3) return ((this.value as number) / 1e3).toFixed(1) + 'k';
                    return this.value.toString();
                }
            }
        },
        tooltip: {
            shared: true,
            pointFormatter: function () {
                let val = Math.abs(this.y as number);
                let formatted = val.toFixed(2);
                let suffix = '';
                if (val >= 1e9) { formatted = (val / 1e9).toFixed(2); suffix = 'B'; }
                else if (val >= 1e6) { formatted = (val / 1e6).toFixed(2); suffix = 'M'; }
                else if (val >= 1e3) { formatted = (val / 1e3).toFixed(2); suffix = 'k'; }
                return `<span style="color:${this.color}">\u25CF</span> ${this.series.name}: <b>${(this.y as number) < 0 ? '-' : ''}${formatted}${suffix}</b><br/>`;
            }
        },
        series: chartSeries as Highcharts.SeriesOptionsType[]
    }), [chartSeries, title]);

    if (chartSeries.length === 0) {
        return (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-50/50">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center px-4">
                    No data available for {targetRegions.join(', ')} {selectedSubCategory !== 'ALL' ? `(${selectedSubCategory})` : ''}
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

export default React.memo(TimeSeriesStackedChart);
