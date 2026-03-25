import React from 'react';
import { useScenarioStore } from '../../store/useScenarioStore';

// Equivalent mappings bound structurally mirroring the core WebGL implementations 
const CATEGORICAL_COLORS = [
    'rgb(34, 139, 34)', 'rgb(255, 140, 0)', 'rgb(70, 130, 180)', 'rgb(218, 112, 214)',
    'rgb(244, 164, 96)', 'rgb(60, 179, 113)', 'rgb(255, 215, 0)', 'rgb(138, 43, 226)'
];

export default function Legend() {
    const { colorScaleParams, selectedVariables } = useScenarioStore();

    if (!colorScaleParams) return null;

    return (
        <div className="absolute bottom-6 right-6 z-10 w-64 bg-slate-900/95 backdrop-blur-md text-slate-100 p-4 rounded-lg shadow-2xl border border-slate-700/50 animate-in fade-in duration-300">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Active Vector: {selectedVariables[0]}
            </h3>

            {/* Logic matching strict string categorical implementations natively */}
            {colorScaleParams.type === 'categorical' && colorScaleParams.categories && (
                <div className="space-y-2">
                    {colorScaleParams.categories.map((cat: string, idx: number) => (
                        <div key={cat} className="flex items-center text-xs text-slate-300 font-mono">
                            <span
                                className="w-3 h-3 rounded-full mr-3 shadow-[0_0_5px_rgba(0,0,0,0.5)] border border-slate-800"
                                style={{ backgroundColor: CATEGORICAL_COLORS[idx % CATEGORICAL_COLORS.length] }}
                            />
                            {cat}
                        </div>
                    ))}
                </div>
            )}

            {/* Scale logic applying correctly rendering sequential native mapping colors using tailwind heuristics perfectly mapping Inferno -> Diverge logic */}
            {colorScaleParams.type === 'continuous' && (
                <div className="space-y-2">
                    {colorScaleParams.domainMin !== undefined && colorScaleParams.domainMin < 0 ? (
                        <>
                            <div className="w-full h-2 rounded bg-gradient-to-r from-red-500 via-white to-emerald-500 shadow-inner" />
                            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                                <span>{(colorScaleParams.domainMin).toFixed(1)}</span>
                                <span>0.0</span>
                                <span>{(colorScaleParams.domainMax).toFixed(1)}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-full h-2 rounded bg-gradient-to-r from-blue-900 via-purple-600 to-orange-400 shadow-inner" />
                            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                                <span>{(colorScaleParams.domainMin || 0).toFixed(1)}</span>
                                <span>{(colorScaleParams.domainMax || 1).toFixed(1)}</span>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
