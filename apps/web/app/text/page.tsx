// System Sync: 2026-02-05
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    UploadCloud,
    Download,
    FileText,
    ShieldAlert,
    Search,
    Filter,
    Eye,
    EyeOff,
    Database,
    Plus,
    X,
    User,
    Briefcase,
    MapPin,
    Calendar,
    Hash,
    MoreVertical,
    Trash2,
    Code,
    CheckCircle2,
    Layers,
    Type,
    Tag,
    AlertTriangle,
    Sparkles,
    Brain,
    ThumbsUp,
    ThumbsDown,
    Minus,
    MessageSquareQuote,
    Share2
} from 'lucide-react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { trackUsage } from '@/lib/usage';

interface Entity {
    mention?: string;
    start: number;
    end: number;
    label: string;
    redaction?: boolean;
}

interface TextBlock {
    text: string;
    type: 'header' | 'paragraph';
    entities?: Entity[];
}

// Enterprise Component for Entity Chips
const EntityChip = ({ label, redaction, onClick, onDelete }: { label: string, redaction?: boolean, onClick?: () => void, onDelete?: () => void }) => {
    let colorClass = "bg-slate-100 text-slate-600 border-slate-200";
    let Icon = Hash;

    const l = label.toUpperCase();
    if (redaction || l.includes('PII') || l.includes('SSN') || l.includes('PHONE')) {
        colorClass = "bg-red-50 text-red-700 border-red-200 shadow-sm shadow-red-100";
        Icon = ShieldAlert;
    } else if (l.includes('PER')) {
        colorClass = "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm shadow-indigo-100";
        Icon = User;
    } else if (l.includes('ORG')) {
        colorClass = "bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-100";
        Icon = Briefcase;
    } else if (l.includes('LOC') || l.includes('GPE')) {
        colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100";
        Icon = MapPin;
    } else if (l.includes('DATE') || l.includes('TIME')) {
        colorClass = "bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-100";
        Icon = Calendar;
    }

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer hover:brightness-95 transition-all select-none ${colorClass}`}
            onClick={onClick}
        >
            <Icon size={12} strokeWidth={2.5} />
            {label}
            {onDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="hover:bg-slate-200/50 p-0.5 rounded-full ml-1 transition-colors"
                >
                    <X size={10} />
                </button>
            )}
        </span>
    );
};

export default function NLPStudio() {
    const [data, setData] = useState<TextBlock[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const [redactionMode, setRedactionMode] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showJson, setShowJson] = useState(false);

    // New NLP Features State
    const [summary, setSummary] = useState("");
    const [sentiment, setSentiment] = useState<"POSITIVE" | "NEUTRAL" | "NEGATIVE" | "">("");
    const [topics, setTopics] = useState<string[]>([]);
    const [relations, setRelations] = useState<{ source: string, target: string, relation: string }[]>([]);

    // Sidebar Manual Select State
    const [selectedManualText, setSelectedManualText] = useState("");
    const [customLabel, setCustomLabel] = useState("");

    // Synthetic Data State
    const [showSynthetic, setShowSynthetic] = useState(false);
    const [syntheticPrompt, setSyntheticPrompt] = useState("");
    const [isGeneratingSynthetic, setIsGeneratingSynthetic] = useState(false);

    const commonTags = [
        "PERSON", "ORGANIZATION", "LOCATION", "DATE", "GPE", "MONEY", "EMAIL", "PHONE", "PRODUCT", "SSN"
    ];

    const entityTypes = useMemo(() => {
        const types = new Set<string>();
        data.forEach(block => block.entities?.forEach(e => types.add(e.label)));
        return Array.from(types).sort();
    }, [data]);

    const allEntities = useMemo(() => {
        const list: { id: string, text: string, label: string, blockIdx: number, entityIdx: number }[] = [];
        data.forEach((block, bIdx) => {
            block.entities?.forEach((e, eIdx) => {
                // If mention exists, use it as source of truth for text
                const entityText = e.mention || block.text.slice(e.start, e.end);
                list.push({
                    id: `entity-${bIdx}-${eIdx}`,
                    text: entityText,
                    label: e.label,
                    blockIdx: bIdx,
                    entityIdx: eIdx
                });
            });
        });
        return list;
    }, [data]);

    const processFile = async (file: File) => {
        setIsProcessing(true);
        setProgress(10);
        setIsProcessing(true);
        setProgress(10);
        setData([]);
        setSummary("");
        setSentiment("");
        setTopics([]);
        setRelations([]);

        const interval = setInterval(() => {
            setProgress(p => p < 90 ? p + 1 : p);
        }, 500);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch('/api/ai/text', {
                method: 'POST',
                body: formData,
            });

            clearInterval(interval);
            setProgress(100);

            const result = await response.json();

            if (response.ok) {
                // Handle new object format
                let normalized = Array.isArray(result) ? result : (result.data || result.blocks || result.document || []);

                // Set new insights
                setSummary(result.summary || "");
                setSentiment(result.sentiment || "");
                setTopics(result.topics || []);
                setRelations(result.relations || []);

                // Self-Correction Logic: If indices are slightly drifted, find them in the text block
                normalized = normalized.map((block: any) => ({
                    ...block,
                    entities: block.entities?.map((e: any) => {
                        if (e.mention) {
                            // Find the mention in the block text near the suggested start
                            // LLMs often drift by +/- 5 chars
                            const searchStart = Math.max(0, e.start - 20);
                            const searchEnd = Math.min(block.text.length, e.end + 20);
                            const segment = block.text.slice(searchStart, searchEnd);
                            const localIdx = segment.indexOf(e.mention);

                            if (localIdx !== -1) {
                                return {
                                    ...e,
                                    start: searchStart + localIdx,
                                    end: searchStart + localIdx + e.mention.length
                                };
                            }
                        }
                        return e;
                    })
                }));

                setData(normalized);
                setSelectedManualText("");

                // Track Usage
                const words = normalized.reduce((acc: number, b: any) => acc + (b.text?.split(/\s+/).length || 0), 0);
                trackUsage({
                    words_processed: words,
                    tokens_input: words * 2, // Heuristic
                    tokens_output: JSON.stringify(normalized).length / 4 // Heuristic
                });
            } else {
                const isOverload = result.error?.toLowerCase().includes('overloaded');
                if (isOverload) {
                    if (confirm("Vyonix is currently high in demand. Would you like to retry the semantic parse?")) {
                        processFile(file);
                        return;
                    }
                }
                alert(`Analysis Error: ${result.error || "Failed to process text"}`);
            }
        } catch (error) {
            alert("Upload failed. Connection issue.");
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    };

    const handleUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.pdf,.jsonl,.docx,.doc,.html,.csv';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            processFile(file);
        };
        input.click();
    };

    const handleTextSelection = () => {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) {
            const text = sel.toString().trim();
            if (text.length > 0) {
                setSelectedManualText(text);
            }
        }
    };

    const addManualEntity = (label: string) => {
        if (!selectedManualText) return;

        setData(prev => {
            let found = false;
            return prev.map(block => {
                if (found) return block;
                const idx = block.text.indexOf(selectedManualText);
                if (idx !== -1) {
                    found = true;
                    const newEntity: Entity = {
                        start: idx,
                        end: idx + selectedManualText.length,
                        label: label,
                        redaction: label.includes('PII') || label.includes('PHONE') || label.includes('SSN')
                    };
                    return {
                        ...block,
                        entities: [...(block.entities || []), newEntity]
                    };
                }
                return block;
            });
        });

        setSelectedManualText("");
        setCustomLabel("");
        window.getSelection()?.removeAllRanges();
    };

    const deleteEntity = (bIdx: number, eIdx: number) => {
        setData(prev => prev.map((block, i) => {
            if (i !== bIdx) return block;
            return {
                ...block,
                entities: block.entities?.filter((_, j) => j !== eIdx)
            };
        }));
    };

    const handleDownload = () => {
        if (data.length === 0) return;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `vyonix_nlp_audit_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGenerateSynthetic = async () => {
        if (!syntheticPrompt) return;
        setIsGeneratingSynthetic(true);
        try {
            const response = await fetch('/api/ai/text/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: syntheticPrompt, type: "Synthetic Data" })
            });
            const result = await response.json();

            if (response.ok && result.success) {
                // Auto-load the generated text as a new "file"
                const blob = new Blob([result.text], { type: 'text/plain' });
                const file = new File([blob], result.filename || "synthetic.txt", { type: "text/plain" });

                // Trigger processFile
                await processFile(file);

                setShowSynthetic(false);
                setSyntheticPrompt("");
                alert(`Synthetic Data Generated & Loaded: ${result.filename}`);
            } else {
                alert(`Generation Failed: ${result.error}`);
            }
        } catch (e) {
            alert("Generation Error");
        } finally {
            setIsGeneratingSynthetic(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#0f172a] text-slate-300 font-sans selection:bg-blue-500/30 selection:text-white overflow-hidden">
            {/* Header */}
            <div className="h-16 bg-[#1e293b] border-b border-slate-700/50 flex items-center justify-between px-6 shadow-xl z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 text-xl">
                        🌌
                    </div>
                    <div>
                        <h1 className="font-black text-white text-lg tracking-tight flex items-center gap-2">
                            VYONIX <span className="text-indigo-400">STUDIO</span>
                            <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded font-mono uppercase border border-slate-600">NLP ENGINE PRO</span>
                        </h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Enterprise Semantic Analysis Studio</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={handleUpload} disabled={isProcessing}
                        className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl text-sm font-black transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50">
                        {isProcessing ? <span className="animate-spin text-sm">↻</span> : <UploadCloud size={16} className="group-hover:-translate-y-0.5 transition-transform" />}
                        {isProcessing ? 'Analyzing Pipeline...' : 'Upload Dataset'}
                    </button>

                    <button onClick={() => setShowSynthetic(true)}
                        className="flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-xl text-sm font-black transition-all shadow-lg shadow-pink-500/20 active:scale-95">
                        <Sparkles size={16} /> Generate Data
                    </button>
                    <button onClick={() => setShowJson(!showJson)} disabled={data.length === 0}
                        className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-white transition-all transition-colors"><Code size={20} /></button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Workspace (Canvas) */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-12 bg-[#0f172a] custom-scrollbar scroll-smooth" onMouseUp={handleTextSelection}>
                    <div className="max-w-5xl mx-auto bg-white rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border border-slate-200 overflow-hidden relative min-h-full">

                        {/* Doc Floating Title */}
                        {data.length > 0 && (
                            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center sticky top-0 z-20 backdrop-blur-md bg-white/90">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                        <FileText size={20} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Intelligence Canvas</span>
                                        <h2 className="text-sm font-black text-slate-800 font-mono tracking-tight">DOCUMENT_CONTENT_ANALYSIS.P</h2>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setRedactionMode(!redactionMode)}
                                        className={`flex items-center gap-2 px-6 py-2 rounded-full text-[11px] font-black tracking-widest transition-all ${redactionMode ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}
                                    >
                                        {redactionMode ? <EyeOff size={14} /> : <Eye size={14} />}
                                        {redactionMode ? 'AUDIT MODE ACTIVE' : 'OBSERVATION MODE'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Analysis Dashboard (New) */}
                        {data.length > 0 && summary && (
                            <div className="grid grid-cols-12 gap-6 p-8 border-b border-slate-100 bg-slate-50/50">
                                {/* Summary Card */}
                                <div className="col-span-12 lg:col-span-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="flex items-center gap-2 mb-3 text-indigo-600">
                                        <MessageSquareQuote size={18} />
                                        <span className="text-xs font-black uppercase tracking-widest">Executive Summary</span>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">{summary}</p>
                                </div>

                                {/* Sentiment & Topics */}
                                <div className="col-span-12 lg:col-span-6 space-y-4">
                                    {/* Sentiment */}
                                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-indigo-600">
                                            <Brain size={18} />
                                            <span className="text-xs font-black uppercase tracking-widest">Sentiment Analysis</span>
                                        </div>
                                        <div className={`px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-2 uppercase tracking-wide
                                            ${sentiment === 'POSITIVE' ? 'bg-emerald-100 text-emerald-700' :
                                                sentiment === 'NEGATIVE' ? 'bg-rose-100 text-rose-700' :
                                                    'bg-slate-100 text-slate-700'}`}>
                                            {sentiment === 'POSITIVE' && <ThumbsUp size={14} />}
                                            {sentiment === 'NEGATIVE' && <ThumbsDown size={14} />}
                                            {sentiment === 'NEUTRAL' && <Minus size={14} />}
                                            {sentiment}
                                        </div>
                                    </div>

                                    {/* Topics */}
                                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                                        <div className="flex items-center gap-2 mb-3 text-indigo-600">
                                            <Tag size={18} />
                                            <span className="text-xs font-black uppercase tracking-widest">Key Topics</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {topics.map((topic, i) => (
                                                <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[11px] font-bold">
                                                    #{topic}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Relations (New) */}
                                    {relations.length > 0 && (
                                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                                            <div className="flex items-center gap-2 mb-3 text-indigo-600">
                                                <Share2 size={18} />
                                                <span className="text-xs font-black uppercase tracking-widest">Key Relationships</span>
                                            </div>
                                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                                {relations.map((rel, i) => (
                                                    <div key={i} className="flex items-center justify-between text-[10px] font-bold bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                        <span className="text-slate-700 truncate max-w-[30%]">{rel.source}</span>
                                                        <div className="flex items-center px-2 text-indigo-400">
                                                            <div className="h-px w-3 bg-indigo-200"></div>
                                                            <span className="px-1 uppercase text-[8px]">{rel.relation}</span>
                                                            <div className="h-px w-3 bg-indigo-200"></div>
                                                            <span className="ml-[1px]">›</span>
                                                        </div>
                                                        <span className="text-slate-700 truncate max-w-[30%] text-right">{rel.target}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Semantic Layer */}
                        <div className="p-12 lg:p-20 py-16">
                            {isProcessing && (
                                <div className="space-y-12 py-20 text-center max-w-md mx-auto">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"></div>
                                        <div className="animate-spin rounded-full h-20 w-20 border-8 border-indigo-500 border-t-transparent mx-auto relative z-10"></div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Analyzing Deep Structure...</h3>
                                        <p className="text-slate-400 text-sm font-medium">Executing Vyonix semantic parse with NER & PII detection.</p>
                                    </div>
                                    <ProgressBar progress={progress} label="Mapping Semantic Tokens..." />
                                </div>
                            )}

                            {!isProcessing && data.length === 0 && (
                                <div className="text-center py-40">
                                    <div className="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center mx-auto mb-8 animate-pulse text-slate-200">
                                        <UploadCloud size={48} />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-300 tracking-tight">Studio Empty</h3>
                                    <p className="text-slate-400 max-w-xs mx-auto mt-4 font-medium">Upload a PDF or Text document to begin the intelligence workflow.</p>
                                    <button onClick={handleUpload} className="mt-8 px-8 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-500 font-black text-sm hover:bg-slate-100 transition-colors">Select Source File</button>
                                </div>
                            )}

                            <div className="space-y-10">
                                {data.map((block, bIdx) => (
                                    <div key={bIdx} className={block.type === 'header' ? 'mt-4 border-l-4 border-indigo-400 pl-8' : ''}>
                                        <BlockRenderer
                                            block={block}
                                            blockIdx={bIdx}
                                            activeFilters={activeFilters}
                                            redactionMode={redactionMode}
                                            onDeleteEntity={(eIdx) => deleteEntity(bIdx, eIdx)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Page Footer */}
                        {data.length > 0 && (
                            <div className="border-t border-slate-100 p-8 flex justify-between items-center bg-slate-50/50">
                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">End of Intelligence Report</div>
                                <CheckCircle2 size={24} className="text-indigo-200" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Intelligence Panel (Sidebar) */}
                <div className="w-[420px] bg-[#1e293b] border-l border-slate-700/50 flex flex-col shadow-2xl z-20 relative">

                    {/* Panel Header */}
                    <div className="p-8 pb-6 bg-[#1e293b] border-b border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-white flex items-center gap-2 text-md tracking-widest uppercase">
                                Intelligence Panel
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 flex flex-col group hover:border-indigo-500/50 transition-colors">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-hover:text-indigo-400 transition-colors">Entities</span>
                                <span className="text-3xl font-black text-white tabular-nums tracking-tighter">{allEntities.length}</span>
                            </div>
                            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 flex flex-col group hover:border-indigo-500/50 transition-colors">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-hover:text-indigo-400 transition-colors">Classes</span>
                                <span className="text-3xl font-black text-white tabular-nums tracking-tighter">{entityTypes.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Manual Annotation Area (DYNAMIC) */}
                    <div className={`transition-all duration-500 overflow-hidden bg-[#1e293b] ${selectedManualText ? 'max-h-[600px] border-b border-indigo-500/30 shadow-indigo-500/20 shadow-inner' : 'max-h-0'}`}>
                        <div className="p-8 pb-10 bg-indigo-500/5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Tag className="text-indigo-400" size={16} />
                                    <span className="text-xs font-black text-indigo-400 tracking-widest uppercase">Tag Active Selection</span>
                                </div>
                                <button onClick={() => setSelectedManualText("")} className="text-slate-500 hover:text-white"><X size={16} /></button>
                            </div>
                            <div className="p-4 bg-[#0f172a] border border-slate-700/50 rounded-2xl text-sm italic text-slate-300 mb-6 bg-indigo-500/10 line-clamp-3 shadow-inner">
                                "{selectedManualText}"
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Quick Apply</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {commonTags.slice(0, 6).map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => addManualEntity(tag)}
                                                className="text-[10px] font-black bg-[#1e293b] hover:bg-indigo-600 text-slate-400 hover:text-white border border-slate-700 hover:border-indigo-500 px-3 py-2.5 rounded-xl transition-all duration-200 text-left capitalize truncate flex items-center gap-2 group"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-white transition-colors"></span>
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Custom Label</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={customLabel}
                                            onChange={(e) => setCustomLabel(e.target.value)}
                                            placeholder="e.g. PROJECT_CODE"
                                            className="flex-1 bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none uppercase"
                                            onKeyDown={(e) => e.key === 'Enter' && customLabel && addManualEntity(customLabel)}
                                        />
                                        <button
                                            onClick={() => customLabel && addManualEntity(customLabel)}
                                            disabled={!customLabel}
                                            className="bg-indigo-600 text-white px-3 rounded-xl disabled:opacity-50 hover:bg-indigo-500 transition-colors"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Explorer Tabs */}
                    <div className="flex-1 flex flex-col min-h-0 bg-[#1e293b]">
                        <div className="p-8 py-6 space-y-6">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search artifacts..."
                                    className="w-full pl-12 pr-6 py-3 bg-[#0f172a] border border-slate-800 rounded-2xl text-sm font-medium text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-600"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {entityTypes.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setActiveFilters(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                                        className={`text-[10px] font-black px-4 py-2 rounded-xl border transition-all tracking-widest uppercase
                                            ${activeFilters.includes(type)
                                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20 active:scale-95'
                                                : 'bg-[#0f172a] text-slate-500 hover:text-slate-300 border-slate-800'}
                                        `}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Artifact Scroll List */}
                        <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-3 custom-scrollbar">
                            {allEntities
                                .filter(e =>
                                    (searchTerm === "" || e.text.toLowerCase().includes(searchTerm.toLowerCase())) &&
                                    (activeFilters.length === 0 || activeFilters.includes(e.label))
                                )
                                .map((e, i) => (
                                    <div
                                        key={i}
                                        onClick={() => {
                                            const el = document.getElementById(e.id);
                                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            el?.classList.add('ring-[12px]', 'ring-indigo-500/20', 'bg-indigo-50');
                                            setTimeout(() => el?.classList.remove('ring-[12px]', 'ring-indigo-500/20', 'bg-indigo-50'), 2000);
                                        }}
                                        className="group p-5 bg-[#0f172a] border border-slate-800 hover:border-indigo-500/30 rounded-2xl cursor-pointer hover:translate-x-1 active:scale-[0.98] transition-all duration-300"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest tracking-tighter">Loc: Block #{e.blockIdx + 1}</div>
                                            <EntityChip label={e.label} redaction={e.label.includes('PII') || e.label.includes('PHONE') || e.label.includes('SSN')} />
                                        </div>
                                        <div className="font-bold text-sm text-slate-200 line-clamp-2 block-selection tracking-tight">"{e.text}"</div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-8 border-t border-slate-800 bg-[#1e293b]/50 backdrop-blur-md">
                        <button onClick={handleDownload} disabled={data.length === 0}
                            className="group w-full bg-white text-[#0f172a] rounded-2xl py-4 font-black text-sm hover:bg-slate-50 transition-all shadow-xl shadow-white/5 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale">
                            <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
                            EXPORT ANNOTATION REPORT
                        </button>
                    </div>
                </div>
            </div>

            {/* RAW PAYLOAD MODAL */}
            {showJson && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-8 lg:p-20">
                    <div className="bg-[#0f172a] border border-slate-800 w-full max-w-6xl rounded-[2.5rem] shadow-2xl flex flex-col h-full overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#1e293b]/50 backdrop-blur-xl">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                                    <Database size={24} />
                                </div>
                                <div>
                                    <h3 className="text-white font-black tracking-widest text-lg uppercase">System Metadata</h3>
                                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em] mt-0.5 underline decoration-indigo-500 decoration-2">Raw JSON Payload Insight</p>
                                </div>
                            </div>
                            <button onClick={() => setShowJson(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl border border-slate-800 text-slate-500 hover:text-white hover:bg-slate-800 transition-all"><X size={24} /></button>
                        </div>
                        <div className="flex-1 overflow-auto p-12 font-mono text-[13px] text-emerald-400/90 whitespace-pre leading-relaxed custom-scrollbar selection:bg-emerald-500/20">
                            {JSON.stringify(data, null, 4)}
                        </div>
                    </div>
                </div>
            )}

            {/* Synthetic Data Generation Panel */}
            <div className={`fixed inset-0 z-50 bg-[#0f172a] transition-transform duration-500 ease-in-out ${showSynthetic ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="h-full flex flex-col max-w-7xl mx-auto p-8 lg:p-12">
                    <div className="flex justify-between items-center mb-12">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-pink-500/10 rounded-2xl text-pink-500 border border-pink-500/20"><Sparkles size={32} /></div>
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tight">Synthetic Data Engine</h2>
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Powered by Gemini 3 Flash Preview</p>
                            </div>
                        </div>
                        <button onClick={() => setShowSynthetic(false)} className="px-6 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 font-bold transition-all">CLOSE ENGINE</button>
                    </div>

                    <div className="flex-1 grid grid-cols-12 gap-12 min-h-0">
                        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
                            <div className="bg-[#1e293b] border border-slate-800 rounded-3xl p-8 flex-1 flex flex-col shadow-2xl">
                                <label className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Prompt Engineering Context</label>
                                <textarea
                                    value={syntheticPrompt}
                                    onChange={(e) => setSyntheticPrompt(e.target.value)}
                                    placeholder="Describe the synthetic dataset you want to generate. Be specific about entities, structure, and domain (e.g. 'Generate a medical report for a patient with hypertension...')"
                                    className="flex-1 bg-[#0f172a] border border-slate-700 rounded-2xl p-6 text-slate-200 focus:ring-2 focus:ring-pink-500/50 outline-none resize-none text-lg leading-relaxed placeholder:text-slate-600"
                                />
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={handleGenerateSynthetic}
                                        disabled={!syntheticPrompt || isGeneratingSynthetic}
                                        className="bg-pink-600 hover:bg-pink-500 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-xl shadow-pink-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                                    >
                                        {isGeneratingSynthetic ? <span className="animate-spin">⏳</span> : <Sparkles size={20} />}
                                        INITIALIZE GENERATION
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-12 lg:col-span-5 flex flex-col justify-center">
                            <div className="bg-gradient-to-br from-pink-500/10 to-indigo-500/10 border border-slate-800 rounded-3xl p-10 text-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                                <h3 className="text-2xl font-black text-white mb-4 relative z-10">Why Synthetic Data?</h3>
                                <p className="text-slate-400 leading-relaxed mb-8 relative z-10">
                                    Generate high-fidelity datasets for training and testing without compromising privacy.
                                    Vyonix uses advanced LLMs to simulate realistic entities, structures, and edge cases.
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center relative z-10">
                                    {['GDPR Compliant', 'Infinite Scale', 'Edge Case Testing', 'Bias Mitigation'].map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-slate-900/50 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-300 uppercase tracking-wider">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #334155;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #475569;
                }
                .block-selection::selection {
                    background: #4f46e5;
                    color: white;
                }
            `}</style>
        </div>
    );
}

const BlockRenderer = ({ block, blockIdx, activeFilters, redactionMode, onDeleteEntity }: { block: TextBlock, blockIdx: number, activeFilters: string[], redactionMode: boolean, onDeleteEntity: (i: number) => void }) => {
    if (block.type === 'header') {
        return <h2 className="text-4xl font-black text-slate-800 mb-8 tracking-tighter leading-[1.1]">{block.text}</h2>;
    }

    if (!block.entities || block.entities.length === 0) {
        return <div className="text-slate-600 leading-[1.8] text-[20px] font-medium tracking-tight mb-8">{block.text}</div>;
    }

    const fragments: React.ReactNode[] = [];
    let lastIndex = 0;
    const sortedEntities = [...block.entities].map((e, i) => ({ ...e, originalIndex: i })).sort((a, b) => a.start - b.start);

    sortedEntities.forEach((entity, i) => {
        if (entity.start < lastIndex) return;

        // Plain text
        if (entity.start > lastIndex) {
            fragments.push(<span key={`t-${i}`} className="text-slate-600 leading-[1.8] text-[20px] font-medium tracking-tight">{block.text.slice(lastIndex, entity.start)}</span>);
        }

        const text = block.text.slice(entity.start, entity.end);
        const isActive = activeFilters.length === 0 || activeFilters.includes(entity.label);
        const id = `entity-${blockIdx}-${entity.originalIndex}`;

        if (!isActive) {
            fragments.push(<span key={`e-${i}`} className="text-slate-600 leading-[1.8] text-[20px] font-medium tracking-tight">{text}</span>);
        } else {
            const isSensitive = entity.redaction || entity.label.includes('PII') || entity.label.includes('SSN') || entity.label.includes('PHONE');
            const showContent = !redactionMode || !isSensitive;

            fragments.push(
                <span
                    id={id}
                    key={`e-${i}`}
                    className={`inline-flex items-center group/chip relative transition-all duration-300 rounded-lg px-1 -mx-0.5
                        ${isSensitive ? 'decoration-red-400/50' : 'decoration-indigo-400/50'}
                        ${!showContent ? 'bg-slate-900 border border-slate-800' : 'bg-transparent'}
                    `}
                >
                    <span className={`text-[20px] font-black transition-all duration-300 ${showContent ? (isSensitive ? 'text-red-700 underline underline-offset-8 decoration-wavy' : 'text-indigo-700 underline underline-offset-8') : 'text-transparent select-none'}`}>
                        {showContent ? text : 'X'.repeat(Math.min(text.length, 20))}
                    </span>

                    {/* Floating Marker (Hiding and using Span/Entity Chip for cleanliness) */}
                    {showContent && (
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/chip:opacity-100 transition-all pointer-events-none scale-90 group-hover/chip:scale-100 z-10 whitespace-nowrap">
                            <EntityChip
                                label={entity.label}
                                redaction={isSensitive}
                                onDelete={() => onDeleteEntity(entity.originalIndex)}
                            />
                        </span>
                    )}

                    {/* Visual Redaction Line if hidden */}
                    {!showContent && (
                        <div className="absolute inset-0 flex items-center justify-center p-1">
                            <ShieldAlert size={14} className="text-red-600 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-600 ml-1 tracking-widest">SENSITIVE</span>
                        </div>
                    )}
                </span>
            );
        }
        lastIndex = entity.end;
    });

    if (lastIndex < block.text.length) {
        fragments.push(<span key="end" className="text-slate-600 leading-[1.8] text-[20px] font-medium tracking-tight">{block.text.slice(lastIndex)}</span>);
    }

    return <div className="leading-[1.8] text-[20px] mb-10 overflow-visible">{fragments}</div>;
};
