import React, { useEffect } from 'react';
import { useScenarioStore } from '../../store/useScenarioStore';
import { fetchSummary } from '../../utils/api';

export default function SummaryDashboard() {
    const {
        baseScenarioId, targetScenarioId,
        baseSummary, setBaseSummary,
        targetSummary, setTargetSummary
    } = useScenarioStore();

    useEffect(() => {
        if (baseScenarioId) {
            fetchSummary(baseScenarioId).then(setBaseSummary).catch(console.error);
        } else {
            setBaseSummary(null);
        }
    }, [baseScenarioId, setBaseSummary]);

    useEffect(() => {
        if (targetScenarioId) {
            fetchSummary(targetScenarioId).then(setTargetSummary).catch(console.error);
        } else {
            setTargetSummary(null);
        }
    }, [targetScenarioId, setTargetSummary]);

    // Hide the HUD completely if no baseline scenario has been requested globally
    if (!baseSummary) return null;

    return (
        <div className="absolute top-4 right-4 z-10 w-80 bg-slate-900/90 backdrop-blur-md text-slate-100 p-5 rounded-lg shadow-2xl border border-slate-700/50 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Fast-Path HUD
            </h3>

            <div className="space-y-4">
                {/* KPI Target: Native Base vs Cross-Compared Baseline Shift Metrics */}
                <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                    <h4 className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Base Ecosystem KPI</h4>
                    <div className="text-xl font-mono text-slate-200">{baseSummary.kpi_score || 'N/A'}</div>
                    {targetSummary && (
                        <div className="mt-3 pt-3 border-t border-slate-700/80 animate-in fade-in transition-all">
                            <h4 className="text-[10px] text-emerald-400 uppercase tracking-widest mb-1 font-semibold">Comparator Shift (+/-)</h4>
                            <div className="text-md font-mono text-emerald-300">
                                {targetSummary.kpi_score - baseSummary.kpi_score > 0 ? '+' : ''}
                                {(targetSummary.kpi_score - baseSummary.kpi_score).toFixed(2)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Second Component Example Metric */}
                <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                    <h4 className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-semibold">Total Carbon Yield (Mt)</h4>
                    <div className="text-xl font-mono text-slate-200">{baseSummary.carbon_yield_mt || 'N/A'}</div>
                    {targetSummary && (
                        <div className="mt-3 pt-3 border-t border-slate-700/80 animate-in fade-in transition-all">
                            <h4 className="text-[10px] text-emerald-400 uppercase tracking-widest mb-1 font-semibold">Comparator Shift (+/-)</h4>
                            <div className="text-md font-mono text-emerald-300">
                                {targetSummary.carbon_yield_mt && baseSummary.carbon_yield_mt
                                    ? (
                                        (targetSummary.carbon_yield_mt - baseSummary.carbon_yield_mt > 0 ? '+' : '') +
                                        (targetSummary.carbon_yield_mt - baseSummary.carbon_yield_mt).toFixed(2)
                                    )
                                    : 'N/A'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
