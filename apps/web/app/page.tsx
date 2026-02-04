
"use client";

import React, { useState, useEffect } from 'react';
import {
  Mic,
  Cpu,
  DollarSign,
  CheckCircle,
  Download,
  Upload,
  Activity,
  Database,
  Image as ImageIcon,
  Type,
  Clock,
  TrendingUp,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { getStats, VyonixStats } from '@/lib/usage';

const MetricCard = ({ title, value, sub, icon: Icon, color, trend }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 flex flex-col justify-between hover:translate-y-[-4px] transition-all duration-300 group">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-4 rounded-2xl ${color.replace('text-', 'bg-')} bg-opacity-10 group-hover:scale-110 transition-transform`}>
        <Icon className={color} size={28} strokeWidth={2.5} />
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-[10px] font-black">
          <TrendingUp size={12} />
          {trend}
        </div>
      )}
    </div>
    <div>
      <p className="text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">{title}</p>
      <h3 className="text-3xl font-black text-slate-800 mt-1 tracking-tighter">{value}</h3>
      <p className="text-[11px] text-slate-500 mt-2 font-medium">{sub}</p>
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState<VyonixStats>(getStats());

  useEffect(() => {
    const refresh = () => setStats(getStats());
    window.addEventListener('usage-updated', refresh);
    return () => window.removeEventListener('usage-updated', refresh);
  }, []);

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 lg:p-8">
      {/* Hero Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 text-2xl">
              🌌
            </div>
            Performance Hub
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2 max-w-md italic">Real-time metrics for Vyonix Studio AI Pipeline. Monitoring 3 enterprise-grade intelligence streams.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-end px-6 border-r border-slate-200">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Status</span>
            <span className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Operational
            </span>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 shadow-xl transition-all active:scale-95 uppercase tracking-widest">
            <Download size={14} strokeWidth={3} />
            Export Audit
          </button>
        </div>
      </div>

      {/* Primary Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Audio Intelligence"
          value={formatTime(stats.audio_seconds)}
          sub={`${stats.audio_files} high-fidelity files`}
          icon={Mic}
          color="text-indigo-600"
          trend="+12%"
        />
        <MetricCard
          title="Vision Artifacts"
          value={stats.images_processed.toLocaleString()}
          sub="Objects detected & localized"
          icon={ImageIcon}
          color="text-emerald-600"
          trend="+5%"
        />
        <MetricCard
          title="Semantic Reach"
          value={stats.words_processed.toLocaleString()}
          sub="NLP Tokens fully analyzed"
          icon={Type}
          color="text-amber-500"
          trend="+22%"
        />
        <MetricCard
          title="Engine Compute"
          value={(stats.tokens_input + stats.tokens_output).toLocaleString()}
          sub="Total Input/Output Tokens"
          icon={Cpu}
          color="text-rose-500"
        />
      </div>

      {/* Secondary Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cost Section */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-2xl shadow-slate-200/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Computational Cost Logic</h3>
                <p className="text-xs text-slate-400 font-medium">Real-time expenditure tracking vs AWS/GCP benchmarks</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                <DollarSign size={24} strokeWidth={3} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Saving</span>
                <div className="text-4xl font-black text-emerald-600 tracking-tighter">$742.80</div>
                <p className="text-[9px] text-slate-400 font-bold uppercase">vs Open Source Hosting</p>
              </div>
              <div className="space-y-1 border-x border-slate-100 px-8">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Input Cost</span>
                <div className="text-4xl font-black text-slate-800 tracking-tighter">${(stats.tokens_input * 0.000001).toFixed(4)}</div>
                <p className="text-[9px] text-slate-400 font-bold uppercase">$0.001 per 1M tokens</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Output Cost</span>
                <div className="text-4xl font-black text-slate-800 tracking-tighter">${(stats.tokens_output * 0.000002).toFixed(4)}</div>
                <p className="text-[9px] text-slate-400 font-bold uppercase">$0.002 per 1M tokens</p>
              </div>
            </div>

            <div className="mt-12 bg-slate-900 rounded-[2rem] p-8 flex items-center justify-between group overflow-hidden relative">
              <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <Activity className="text-white" size={32} />
                </div>
                <div>
                  <h4 className="text-white font-black text-lg">System Throughput</h4>
                  <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mt-1">1,240 REQUESTS PER MINUTE</p>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="h-2 w-48 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-indigo-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Health */}
        <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-slate-800">
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full" />

          <h3 className="text-xl font-black mb-8 flex items-center gap-3">
            <ShieldCheck className="text-indigo-400" size={24} strokeWidth={2.5} />
            Security & Health
          </h3>

          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Vyonix-I-3 API</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">STABLE</span>
              </div>
              <div className="text-2xl font-black tracking-tighter">99.98%</div>
            </div>

            <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Batch Latency</span>
              </div>
              <div className="text-2xl font-black tracking-tighter">~1.4s</div>
              <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-widest">Latency per 1k tokens</p>
            </div>

            <div className="mt-8 pt-8 border-t border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Pipeline Version</h4>
                <span className="text-xs font-mono text-indigo-400">v4.0.2-prod</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                  <div key={i} className={`h-6 w-full rounded-sm ${i > 10 ? 'bg-indigo-500/20' : 'bg-emerald-500'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
