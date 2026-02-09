// System Sync: 2026-02-05

"use client";

import React, { useState, useEffect } from 'react';
import { DollarSign, AlertCircle, TrendingDown, PieChart, Activity, Zap, Layers, Cpu } from 'lucide-react';
import { getStats, VyonixStats } from '@/lib/usage';

export default function FinancialConsole() {
    const [hours, setHours] = useState(2350);
    const [stats, setStats] = useState<VyonixStats>(getStats());

    useEffect(() => {
        const refresh = () => setStats(getStats());
        window.addEventListener('usage-updated', refresh);
        return () => window.removeEventListener('usage-updated', refresh);
    }, []);

    // Savings Logic
    const tokensPerHour = 32 * 3600;
    const projectedTokens = hours * tokensPerHour;
    const standardCost = (projectedTokens / 1000000) * 0.075;
    const batchCost = (projectedTokens / 1000000) * 0.0375;
    const savingsPercent = 50;

    // Real-time Logic from Stats
    const liveInputCost = (stats.tokens_input / 1000000) * 0.075;
    const liveOutputCost = (stats.tokens_output / 1000000) * 0.15; // Higher for output
    const liveTotal = liveInputCost + liveOutputCost;

    return (
        <div className="max-w-5xl mx-auto space-y-8 p-4 lg:p-10 bg-slate-50/50 min-h-screen">
            {/* Header Area */}
            <div className="flex justify-between items-end">
                <div>
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 mb-2 inline-block">Finance Engine</span>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Budgetary <span className="text-indigo-600">Intelligence</span></h1>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Instance Spend</p>
                    <div className="text-3xl font-black text-slate-900 tracking-tighter">${liveTotal.toFixed(4)}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Interactive Calculator */}
                <div className="lg:col-span-7 space-y-8">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
                        <div className="p-10">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 text-2xl">
                                    🌌
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Enterprise Savings Calculator</h2>
                                    <p className="text-xs text-slate-400 font-medium italic">Project savings for scheduled batch pipelines</p>
                                </div>
                            </div>

                            <div className="space-y-10">
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Projected Audio Volume (Hours)</label>
                                        <span className="px-4 py-2 bg-slate-900 text-white rounded-xl text-lg font-black tracking-tighter shadow-lg">{hours} HRS</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="100"
                                        max="10000"
                                        step="100"
                                        value={hours}
                                        onChange={(e) => setHours(parseInt(e.target.value))}
                                        className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-all border border-slate-200 shadow-inner"
                                    />
                                    <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-300 uppercase">
                                        <span>100 HRS</span>
                                        <span>10,000 HRS</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col justify-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard Compute</span>
                                        <div className="text-3xl font-black text-slate-400 line-through tracking-tighter">${standardCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                        <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase underline underline-offset-4">Latency: Immediate</p>
                                    </div>
                                    <div className="p-8 bg-indigo-600 rounded-[2rem] text-white shadow-2xl shadow-indigo-500/30 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-3">
                                            <Zap size={16} className="text-indigo-300 animate-pulse" />
                                        </div>
                                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Vyonix Batch Savings</span>
                                        <div className="text-4xl font-black tracking-tighter">${batchCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                        <div className="mt-4 flex items-center gap-2">
                                            <div className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Saved 50%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-[#0f172a] rounded-[2.5rem] border border-slate-800 text-white flex items-center justify-between shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-indigo-500/5 blur-3xl rounded-full" />
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                                <AlertCircle className="text-indigo-400" size={32} />
                            </div>
                            <div className="max-w-md">
                                <h4 className="text-lg font-black tracking-tight">Pricing Disclaimer</h4>
                                <p className="text-slate-400 text-[11px] leading-relaxed mt-1 font-medium italic opacity-80">
                                    Calculations based on Vyonix Intel-Stream input pricing (\$0.075/1M). Real-world costs may vary up to 15% depending on recursion depth and entity density of the source document.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Live Token Stream */}
                <div className="lg:col-span-5 flex flex-col gap-8">
                    {/* Token Counter Card */}
                    <div className="bg-[#1e293b] rounded-[2.5rem] p-10 text-white shadow-2xl border border-slate-700/50 flex-1 relative overflow-hidden">
                        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-indigo-600/20 blur-3xl rounded-full" />

                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400 mb-8 flex items-center gap-2">
                            <Layers size={14} />
                            Live Compute Monitor
                        </h3>

                        <div className="space-y-10 relative z-10">
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tokens Processed (Input)</span>
                                    <span className="text-xs font-mono font-bold text-indigo-300">{stats.tokens_input.toLocaleString()}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: '65%' }} />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tokens Generated (Output)</span>
                                    <span className="text-xs font-mono font-bold text-emerald-300">{stats.tokens_output.toLocaleString()}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: '40%' }} />
                                </div>
                            </div>

                            <div className="pt-10 border-t border-slate-700/50 flex flex-col gap-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/10 rounded-lg"><Cpu size={16} className="text-indigo-400" /></div>
                                        <span className="text-xs font-bold text-slate-300">Semantic Compute</span>
                                    </div>
                                    <span className="text-xs font-black text-white">${liveInputCost.toFixed(5)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-lg"><Activity size={16} className="text-emerald-400" /></div>
                                        <span className="text-xs font-bold text-slate-300">Synthesis Compute</span>
                                    </div>
                                    <span className="text-xs font-black text-white">${liveOutputCost.toFixed(5)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12">
                            <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl py-4 font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/40 active:scale-95">
                                Download Monthly Billing Audit
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
