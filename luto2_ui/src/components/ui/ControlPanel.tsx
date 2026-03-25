import React, { useEffect, useState } from 'react';
import { useScenarioStore } from '../../store/useScenarioStore';
import { fetchScenarios } from '../../utils/api';

export default function ControlPanel() {
    const {
        baseScenarioId, targetScenarioId,
        setBaseScenarioId, setTargetScenarioId,
        selectedYear, setSelectedYear,
        selectedVariables, setSelectedVariables
    } = useScenarioStore();

    const [scenarios, setScenarios] = useState<any[]>([]);
    const [isCompare, setIsCompare] = useState(false);

    useEffect(() => {
        fetchScenarios().then(setScenarios).catch(console.error);
    }, []);

    const handleToggleCompare = () => {
        if (isCompare) setTargetScenarioId(null);
        setIsCompare(!isCompare);
    }

    return (
        <div className="absolute top-4 left-4 z-10 w-80 bg-slate-900/95 backdrop-blur-md text-slate-100 p-5 rounded-lg shadow-2xl space-y-4 border border-slate-700/50">
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">LUTO2 Spatial Explorer</h2>

            {/* Comparator Toggle HUD */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <span className="text-sm font-semibold tracking-wide text-slate-300">Compare Models</span>
                <button
                    onClick={handleToggleCompare}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${isCompare ? 'bg-emerald-500 text-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                >
                    {isCompare ? 'ACTIVE' : 'OFF'}
                </button>
            </div>

            {/* Origin Selection */}
            <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base Scenario</label>
                <select
                    className="w-full bg-slate-800/80 p-2 rounded-md text-sm outline-none border border-slate-600 focus:border-blue-500 transition-colors"
                    value={baseScenarioId || ''}
                    onChange={(e) => setBaseScenarioId(e.target.value)}
                >
                    <option value="">Select Base Model...</option>
                    {scenarios.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                </select>
            </div>

            {isCompare && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Target Scenario (Delta)</label>
                    <select
                        className="w-full bg-slate-900 p-2 rounded-md text-sm outline-none border-l-2 border-l-emerald-500 border-y border-r border-slate-700 focus:border-emerald-400 transition-colors"
                        value={targetScenarioId || ''}
                        onChange={(e) => setTargetScenarioId(e.target.value)}
                    >
                        <option value="">Select Target Model...</option>
                        {scenarios.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                    </select>
                </div>
            )}

            {/* Matrix Timeframe Filters */}
            <div className="space-y-2 pt-3">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Year</label>
                    <span className="text-sm font-mono font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">{selectedYear}</span>
                </div>
                <input
                    type="range"
                    min="2020" max="2050" step="5"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>

            {/* Target Render Variables */}
            <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Core Projection Metric</label>
                <select
                    className="w-full bg-slate-800/80 p-2 rounded-md text-sm outline-none border border-slate-600 focus:border-blue-500 transition-colors"
                    value={selectedVariables[0] || ''}
                    onChange={(e) => setSelectedVariables([e.target.value])}
                >
                    <option value="yield_wheat">Yield: Wheat (Tonnes)</option>
                    <option value="yield_cattle">Yield: Cattle (Head/KM)</option>
                    <option value="emissions_ag">Ag Emissions (kt CO2-e)</option>
                    <option value="dominant_land_use">Dominant Categorical Land Use</option>
                </select>
            </div>
        </div>
    );
}
