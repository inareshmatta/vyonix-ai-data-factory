"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
    Video,
    UploadCloud,
    Download,
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Sparkles,
    Loader2,
    Clock,
    Activity,
    Settings2,
    Scissors,
    Zap,
    MessageSquare,
    Eye
} from 'lucide-react';
import { trackUsage } from '@/lib/usage';

interface VideoTimestamp {
    id: number;
    time: number;
    label: string;
    description: string;
}

export default function VideoStudio() {
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [timestamps, setTimestamps] = useState<VideoTimestamp[]>([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [insights, setInsights] = useState<string>("");

    // Configuration
    const [fps, setFps] = useState(1);
    const [clipping, setClipping] = useState({ start: 0, end: 0 });

    const videoRef = useRef<HTMLVideoElement>(null);

    const handleVideoUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            setVideoSrc(url);
            setTimestamps([]);
            setInsights("");
        };
        input.click();
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) videoRef.current.pause();
        else videoRef.current.play();
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setClipping({ start: 0, end: videoRef.current.duration });
        }
    };

    const seekTo = (time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleAutoAnalyze = async () => {
        if (!videoSrc) return;
        setIsProcessing(true);
        try {
            // Simulated Gemini 1.5 Flash Analysis
            // In production, you'd send the video to your API
            setTimeout(() => {
                const results = [
                    { id: 1, time: 2.5, label: "Scene Transition", description: "Indoor to Outdoor transition detected." },
                    { id: 2, time: 10.2, label: "Object Motion", description: "Vehicle moving from left to right." },
                    { id: 3, time: 24.8, label: "Speech Peak", description: "Emotional variance detected in speaker audio." }
                ];
                setTimestamps(results);
                setInsights("Gemini 1.5 Flash Multimodal Summary: The video depicts a sequence of industrial operations followed by a transition to natural environment. High activity detected in the 10s-15s window. Audio context suggests a positive sentiment.");
                setIsProcessing(false);

                trackUsage({
                    tokens_input: 50000, // Video is expensive
                    tokens_output: 500
                });
            }, 3000);
        } catch (e) {
            alert("Analysis failed");
            setIsProcessing(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-20 shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🌌</span>
                    <h1 className="font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        Vyonix AI <span className="text-blue-600">Data Factory</span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded font-black tracking-widest uppercase">Video Intelligence</span>
                    </h1>
                </div>

                <div className="flex gap-2">
                    <button onClick={handleVideoUpload} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-all">
                        <UploadCloud size={16} />
                        Upload Video
                    </button>
                    <button onClick={handleAutoAnalyze} disabled={!videoSrc || isProcessing} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm disabled:opacity-50">
                        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                        {isProcessing ? 'Analyzing Frames...' : 'Analyze with Gemini 1.5 Flash'}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden lg:p-6 gap-8">
                {/* Main Viewport */}
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                    <div className="flex-1 bg-slate-900 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex items-center justify-center border border-slate-800">
                        {videoSrc ? (
                            <video
                                ref={videoRef}
                                src={videoSrc}
                                className="max-w-full max-h-full"
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                            />
                        ) : (
                            <div className="flex flex-col items-center text-slate-500">
                                <div className="p-6 bg-slate-800 rounded-3xl mb-4">
                                    <Video size={48} />
                                </div>
                                <p className="font-black text-xs uppercase tracking-[0.2em]">Neural Video Engine Idle</p>
                            </div>
                        )}
                    </div>

                    {/* Timeline Controls */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/20">
                        <div className="flex items-center gap-4 mb-4">
                            <button onClick={togglePlay} className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
                                {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="ml-0.5" />}
                            </button>
                            <div className="flex-1 h-2 bg-slate-100 rounded-full relative">
                                <div
                                    className="absolute top-0 left-0 h-full bg-blue-600 rounded-full"
                                    style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                                />
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 100}
                                    value={currentTime}
                                    onChange={(e) => seekTo(parseFloat(e.target.value))}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            </div>
                            <span className="text-xs font-mono text-slate-500 w-24">
                                {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
                            </span>
                        </div>
                        <div className="flex justify-center gap-8 border-t border-slate-100 pt-4">
                            {[
                                { icon: SkipBack, label: "-5s", onClick: () => seekTo(currentTime - 5) },
                                { icon: Scissors, label: "Set Start", onClick: () => setClipping(c => ({ ...c, start: currentTime })) },
                                {
                                    icon: Clock, label: "Add Mark", onClick: () => {
                                        setTimestamps(prev => [...prev, { id: Date.now(), time: currentTime, label: "User Marker", description: "Manual annotation placeholder" }]);
                                    }
                                },
                                { icon: Scissors, label: "Set End", onClick: () => setClipping(c => ({ ...c, end: currentTime })) },
                                { icon: SkipForward, label: "+5s", onClick: () => seekTo(currentTime + 5) }
                            ].map((ctrl, i) => (
                                <button key={i} onClick={ctrl.onClick} className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors">
                                    <ctrl.icon size={18} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{ctrl.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Analytics Sidebar */}
                <div className="w-96 flex flex-col gap-6 overflow-hidden">
                    {/* Insights Card */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/20 flex flex-col overflow-hidden">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Sparkles size={20} />
                            </div>
                            <h3 className="font-black text-slate-800 tracking-tight uppercase text-xs">Multimodal Insights</h3>
                        </div>
                        <div className="flex-1 overflow-auto text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            {insights || "Run Gemini analysis to extract detailed visual and audio context insights."}
                        </div>

                        {/* Settings */}
                        <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sampling Rate</span>
                                <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                                    {[0.5, 1, 2].map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setFps(r)}
                                            className={`px-3 py-1 rounded-md text-[10px] font-black ${fps === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                        >
                                            {r} FPS
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timestamps Card */}
                    <div className="flex-1 bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <Clock className="text-blue-400" size={20} />
                                <h3 className="font-black text-xs uppercase tracking-[0.2em]">Temporal References</h3>
                            </div>
                            <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-mono">{timestamps.length} Marks</span>
                        </div>

                        <div className="flex-1 overflow-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                            {timestamps.map(ts => (
                                <div
                                    key={ts.id}
                                    onClick={() => seekTo(ts.time)}
                                    className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-blue-400 font-mono text-xs">{ts.time.toFixed(2)}s</span>
                                        <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded font-black opacity-0 group-hover:opacity-100 transition-opacity">SEEK</span>
                                    </div>
                                    <h4 className="text-xs font-black uppercase tracking-wider">{ts.label}</h4>
                                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{ts.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
