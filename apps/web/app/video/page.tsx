"use client";

import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Zap, Play, Pause, RotateCcw, Download, Tag, FileText, CheckCircle2, Video, Plus, X, Type, MousePointer2, Sparkles, Loader2 } from 'lucide-react';
// import { analyzeVideoWithGemini } from './actions'; // Dynamic import used instead
import { useStudioState } from '@/contexts/StudioStateContext';
import { generateVideoWithVeo } from './videoGenActions';

export default function VideoStudio() {
    const { state, setVideoState } = useStudioState();

    // Local state for UI only (playing, etc.)
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [duration, setDuration] = useState(0);
    const [videoAspectRatio, setVideoAspectRatio] = useState(16 / 9); // Default to 16:9

    // Modes
    const [mode, setMode] = useState<'detection' | 'transcription' | 'generation'>('detection');
    const [tool, setTool] = useState<'pointer' | 'box'>('pointer');

    // Generation State
    const [genPrompt, setGenPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Manual Annotation State
    const [isDrawing, setIsDrawing] = useState(false);
    const [boxStart, setBoxStart] = useState<{ x: number, y: number } | null>(null);
    const [tempBox, setTempBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Sync from Context
    const { videoFile, videoSrc, annotations, transcripts, generatedVideos } = state.video;

    const handleVideoUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const url = URL.createObjectURL(file);
                // Save to Context
                setVideoState({
                    videoFile: file,
                    videoSrc: url,
                    annotations: [],
                    transcripts: [],
                    generatedVideos: []
                });
            }
        };
        input.click();
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
                setVideoAspectRatio(videoRef.current.videoWidth / videoRef.current.videoHeight);
            }
        }
    };

    // Helper: Format seconds to HH:MM:SS
    const formatTime = (seconds: number) => {
        if (isNaN(seconds)) return "00:00:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // --- Gemini 3 Flash Integration (Server Action) ---
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                // Remove data:video/mp4;base64, prefix
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    };

    const analyzeSegment = async () => {
        if (!videoFile) return;
        setIsProcessing(true);

        try {
            const base64Data = await fileToBase64(videoFile);

            let prompt = "";
            if (mode === 'detection') {
                prompt = `Analyze this video at timestamp ${currentTime.toFixed(2)}s. Identify and name the main object visible (e.g., "Robot Owl", "Car", "Person walking"). Return ONLY valid JSON: { "label": "SPECIFIC_OBJECT_NAME", "confidence": 0.0-1.0, "box_2d": [ymin, xmin, ymax, xmax] } where coordinates are 0-1 fractions of frame dimensions. The label MUST be descriptive, not generic.`;
            } else {
                prompt = `Analyze the video segment around ${currentTime.toFixed(2)}s. Provide a structured transcription of dialogue and significant audio events. Return ONLY valid JSON: { "transcripts": [{ "timestamp_seconds": number, "text": "Speaker: Content" }] } where timestamp_seconds is the precise time in the video.`;
            }

            // Use API route instead of server action to bypass payload serialization limits
            const response = await fetch('/api/ai/video/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    base64Data,
                    mimeType: videoFile.type,
                    prompt
                })
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                console.error("Analysis failed:", result.error);
                alert(`API Error: ${result.error}`);
            } else if (result.text) {
                const text = result.text;
                if (mode === 'detection') {
                    try {
                        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
                        const data = JSON.parse(jsonStr);

                        const newAnnotation = {
                            id: Date.now(),
                            timestamp: currentTime,
                            label: (data.label || "Detected Object"),
                            box: (data.box_2d || [0.2, 0.2, 0.5, 0.5]),
                            confidence: (data.confidence || 0.95)
                        };
                        // Save to Context
                        setVideoState({ annotations: [...annotations, newAnnotation] });

                    } catch (e) {
                        console.warn("Could not parse JSON from API response. Raw text:", text);
                        alert(`AI returned non-JSON response. Raw: ${text.substring(0, 200)}...`);
                    }
                } else {
                    try {
                        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
                        // Try to parse as JSON first
                        const data = JSON.parse(jsonStr);

                        if (data.transcripts && Array.isArray(data.transcripts)) {
                            const newTranscripts = data.transcripts.map((t: any, i: number) => ({
                                id: Date.now() + i,
                                timestamp: (typeof t.timestamp_seconds === 'number' ? t.timestamp_seconds : currentTime),
                                text: t.text
                            }));
                            setVideoState({ transcripts: [...transcripts, ...newTranscripts] });
                        } else {
                            throw new Error("Invalid JSON format");
                        }
                    } catch (e) {
                        // Fallback to plain text if JSON parsing fails
                        const newTranscript = {
                            id: Date.now(),
                            timestamp: currentTime,
                            text: text
                        };
                        setVideoState({ transcripts: [...transcripts, newTranscript] });
                    }
                }
            }

        } catch (error) {
            console.error("Gemini Execution Error:", error);
            alert(`Execution Error: ${error}`);
        }

        setIsProcessing(false);
    };

    // --- Veo 3.1 Generation ---
    const handleGenerateVideo = async () => {
        if (!genPrompt.trim()) return;
        setIsGenerating(true);

        try {
            const response = await fetch('/api/ai/video/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: genPrompt,
                    aspectRatio: "16:9",
                    resolution: "720p"
                })
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                console.error("Veo Error:", result.error);

                let errorMessage = result.error || "Generation failed";

                // Handle specific API permission error nicely
                if (errorMessage.includes("SERVICE_DISABLED") || errorMessage.includes("PERMISSION_DENIED")) {
                    errorMessage = "Video generation requires the Generative Language API to be enabled in Google Cloud Console. Alternatively, use an API key from Google AI Studio.";
                }

                // Show error in UI without alert
                const errorItem = {
                    id: Date.now(),
                    prompt: genPrompt,
                    error: errorMessage,
                    timestamp: new Date().toISOString()
                };
                setVideoState({
                    generatedVideos: [...generatedVideos, JSON.stringify(errorItem)]
                });
            } else if (result.videoUrl) {
                // Successfully generated video - add URL to list
                const videoItem = {
                    id: Date.now(),
                    prompt: genPrompt,
                    videoUrl: result.videoUrl,
                    videoName: result.videoName,
                    timestamp: new Date().toISOString()
                };
                setVideoState({
                    generatedVideos: [...generatedVideos, JSON.stringify(videoItem)]
                });
            }
            setGenPrompt(""); // Clear input
        } catch (error) {
            console.error("Generation Error:", error);
        }
        setIsGenerating(false);
    };

    // --- Manual Annotation ---
    const handleMouseDown = (e: React.MouseEvent) => {
        if (tool === 'box' && mode === 'detection') {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            setBoxStart({ x, y });
            setIsDrawing(true);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDrawing && boxStart) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            setTempBox({
                x: Math.min(boxStart.x, x),
                y: Math.min(boxStart.y, y),
                w: Math.abs(x - boxStart.x),
                h: Math.abs(y - boxStart.y)
            });
        }
    };

    const handleMouseUp = () => {
        if (isDrawing && tempBox) {
            const newId = Date.now();
            const newAnnotation = {
                id: newId,
                timestamp: currentTime,
                label: "Manual Region",
                box: [tempBox.y / 100, tempBox.x / 100, (tempBox.y + tempBox.h) / 100, (tempBox.x + tempBox.w) / 100],
                confidence: 1.0
            };
            // Save to Context
            setVideoState({ annotations: [...annotations, newAnnotation] });
            setTempBox(null);
            // Auto-edit the new annotation
            setEditingId(newId);
        }
        setIsDrawing(false);
        setBoxStart(null);
    };

    const updateAnnotationLabel = (id: number, newLabel: string) => {
        setVideoState({
            annotations: annotations.map(a => a.id === id ? { ...a, label: newLabel } : a)
        });
    };

    const exportJSON = () => {
        const data = {
            metadata: {
                filename: videoFile?.name,
                duration: duration,
                duration_formatted: formatTime(duration),
                generated: new Date().toISOString()
            },
            annotations: annotations.map(a => ({
                ...a,
                timestamp: formatTime(a.timestamp)
            })),
            transcripts: transcripts.map(t => ({
                ...t,
                timestamp: formatTime(t.timestamp)
            }))
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-analysis-${Date.now()}.json`;
        a.click();
    };

    return (
        <div className="flex flex-col h-full gap-6">
            <header className="flex items-center justify-between flex-shrink-0">
                <a href="/" className="hover:opacity-80 transition-opacity cursor-pointer">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Video className="text-blue-600" />
                        Video Intelligence Studio
                    </h1>
                    <p className="text-slate-500">Object Tracking, Action Recognition & Generation with Vyonix Agent</p>
                </a>
                <div className="flex gap-3">
                    <button
                        onClick={handleVideoUpload}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium"
                    >
                        <UploadCloud size={18} />
                        Upload Video
                    </button>
                    <button
                        onClick={exportJSON}
                        disabled={annotations.length === 0 && transcripts.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={18} />
                        Export JSON
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Main Video Area */}
                <div className="lg:col-span-2 flex flex-col gap-4 min-h-0 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setMode('detection')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'detection' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Object Detection
                            </button>
                            <button
                                onClick={() => setMode('transcription')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'transcription' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Transcription
                            </button>
                            <button
                                onClick={() => setMode('generation')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'generation' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Sparkles size={14} className="inline mr-1" />
                                Generate
                            </button>
                        </div>

                        {mode === 'detection' && (
                            <div className="flex items-center gap-1 text-sm bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                <button
                                    onClick={() => setTool('pointer')}
                                    className={`px-3 py-1 rounded-md transition-all ${tool === 'pointer' ? 'bg-blue-600 text-white font-bold' : 'text-slate-500 hover:bg-slate-100'}`}
                                >
                                    Pointer
                                </button>
                                <button
                                    onClick={() => setTool('box')}
                                    className={`px-3 py-1 rounded-md transition-all ${tool === 'box' ? 'bg-blue-600 text-white font-bold' : 'text-slate-500 hover:bg-slate-100'}`}
                                >
                                    Draw Box
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Video Player / Canvas */}
                    <div
                        className="bg-slate-900 rounded-xl overflow-hidden aspect-video relative flex-shrink-0 group shadow-2xl border border-slate-800"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                    >
                        {mode === 'generation' && generatedVideos.length > 0 ? (
                            <video
                                src={generatedVideos[generatedVideos.length - 1]}
                                controls
                                className="w-full h-full object-contain"
                            />
                        ) : videoSrc ? (
                            <div className="w-full h-full flex items-center justify-center bg-black">
                                <div className="relative" style={{ aspectRatio: videoAspectRatio, maxHeight: '100%', maxWidth: '100%' }}>
                                    <video
                                        ref={videoRef}
                                        src={videoSrc}
                                        className="w-full h-full object-contain"
                                        onTimeUpdate={handleTimeUpdate}
                                        onLoadedMetadata={handleLoadedMetadata}
                                        onEnded={() => setIsPlaying(false)}
                                        crossOrigin="anonymous"
                                    />

                                    {/* Overlay Layer - Now matches video dimensions exactly */}
                                    <div className="absolute inset-0 pointer-events-none z-10">
                                        {/* Render Annotations */}
                                        {mode === 'detection' && annotations.map(ann => {
                                            // Show if within 1 second window (more forgiving)
                                            if (Math.abs(ann.timestamp - currentTime) > 0.5) return null;

                                            return (
                                                <div
                                                    key={ann.id}
                                                    className="absolute border-2 border-green-500 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all duration-200"
                                                    style={{
                                                        top: `${ann.box[0] * 100}%`,
                                                        left: `${ann.box[1] * 100}%`,
                                                        height: `${(ann.box[2] - ann.box[0]) * 100}%`,
                                                        width: `${(ann.box[3] - ann.box[1]) * 100}%`
                                                    }}
                                                >
                                                    <span className="absolute -top-6 left-0 bg-green-500 text-black text-xs px-2 py-0.5 rounded font-bold">
                                                        {ann.label} {Math.round(ann.confidence * 100)}%
                                                    </span>
                                                </div>
                                            );
                                        })}

                                        {/* Temporary Drawing Box */}
                                        {tempBox && (
                                            <div
                                                className="absolute border-2 border-blue-500 bg-blue-500/20"
                                                style={{
                                                    left: `${tempBox.x}%`,
                                                    top: `${tempBox.y}%`,
                                                    width: `${tempBox.w}%`,
                                                    height: `${tempBox.h}%`
                                                }}
                                            />
                                        )}
                                    </div>

                                    {/* Controls Overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-4">
                                        <button
                                            onClick={togglePlay}
                                            className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform"
                                        >
                                            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                                        </button>

                                        <div className="flex-1">
                                            <input
                                                type="range"
                                                min="0"
                                                max={duration || 100}
                                                value={currentTime}
                                                onChange={(e) => {
                                                    const time = parseFloat(e.target.value);
                                                    setCurrentTime(time);
                                                    if (videoRef.current) videoRef.current.currentTime = time;
                                                }}
                                                className="w-full accent-blue-500 h-1 bg-slate-600 rounded-full appearance-none cursor-pointer"
                                            />
                                        </div>

                                        <span className="text-white text-xs font-mono font-medium">
                                            {formatTime(currentTime)} / {formatTime(duration)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                                {mode === 'generation' ? (
                                    <Sparkles size={48} className="text-purple-500 opacity-50 mb-2" />
                                ) : (
                                    <Video size={48} className="opacity-50 mb-2" />
                                )}
                                <p className="font-medium text-lg">
                                    {mode === 'generation' ? "Enter a prompt to generate video" : "No video loaded"}
                                </p>
                                {mode !== 'generation' && (
                                    <button
                                        onClick={handleVideoUpload}
                                        className="text-blue-500 hover:text-blue-400 font-medium hover:underline"
                                    >
                                        Select a file to begin
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex gap-4">
                        {mode === 'generation' ? (
                            <div className="flex-1 flex gap-2">
                                <input
                                    type="text"
                                    value={genPrompt}
                                    onChange={(e) => setGenPrompt(e.target.value)}
                                    placeholder="Describe the video you want to generate (e.g. 'Cyberpunk owl flying through neon city')"
                                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                />
                                <button
                                    onClick={handleGenerateVideo}
                                    disabled={!genPrompt.trim() || isGenerating}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                                    Generate Video
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-blue-800">
                                        <p className="font-bold text-xs uppercase tracking-wider opacity-70 mb-1">Current Model</p>
                                        <div className="flex items-center gap-2 font-semibold">
                                            <Zap size={14} className="fill-blue-600" />
                                            Vyonix Agent
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-slate-600">
                                        <p className="font-bold text-xs uppercase tracking-wider opacity-70 mb-1">Status</p>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                                            {isProcessing ? 'Processing...' : 'Ready'}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={analyzeSegment}
                                    disabled={!videoFile || isProcessing}
                                    className="flex-shrink-0 w-48 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
                                >
                                    {isProcessing ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Processing...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="flex items-center gap-2 text-lg">
                                                {mode === 'detection' ? 'AI Auto-Detect' : 'AI Transcribe'}
                                                <Zap size={18} className="fill-white" />
                                            </span>
                                            <span className="text-[10px] font-normal opacity-80 mt-0.5">at current timestamp</span>
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-0 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            {mode === 'detection' ? <Tag size={18} /> : mode === 'generation' ? <Video size={18} /> : <FileText size={18} />}
                            {mode === 'detection' ? 'Objects' : mode === 'generation' ? 'Generated' : 'Transcript'}
                        </h2>
                        <span className="text-xs font-mono bg-slate-200 px-2 py-1 rounded-full text-slate-600">
                            {mode === 'detection' ? annotations.length : mode === 'generation' ? generatedVideos.length : transcripts.length} items
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {mode === 'detection' ? (
                            annotations.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8">
                                    <Tag className="mb-3 opacity-20" size={48} />
                                    <p className="text-sm">No objects. Use the Draw tool or AI Auto-Detect.</p>
                                </div>
                            ) : (
                                annotations.map((ann, i) => (
                                    <div
                                        key={ann.id}
                                        className={`p-3 rounded-lg border text-sm transition-all cursor-pointer ${Math.abs(ann.timestamp - currentTime) < 0.5
                                            ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200'
                                            : 'bg-white border-slate-100 hover:border-blue-100 hover:bg-slate-50'
                                            }`}
                                        onClick={() => {
                                            setCurrentTime(ann.timestamp);
                                            if (videoRef.current) videoRef.current.currentTime = ann.timestamp;
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                                    {formatTime(ann.timestamp)}
                                                </span>
                                                {editingId === ann.id ? (
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        className="font-bold text-slate-800 border-b border-blue-500 outline-none bg-transparent w-full min-w-[80px]"
                                                        defaultValue={ann.label}
                                                        onBlur={(e) => {
                                                            updateAnnotationLabel(ann.id, e.target.value);
                                                            setEditingId(null);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                updateAnnotationLabel(ann.id, e.currentTarget.value);
                                                                setEditingId(null);
                                                            }
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <span
                                                        className="font-bold text-slate-800 cursor-text hover:bg-slate-100 px-1 rounded border border-transparent hover:border-slate-200 transition-all"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingId(ann.id);
                                                        }}
                                                        title="Click to edit label"
                                                    >
                                                        {ann.label}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const newAnnotations = annotations.filter(a => a.id !== ann.id);
                                                    setVideoState({ annotations: newAnnotations });
                                                }}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-green-500 rounded-full"
                                                    style={{ width: `${ann.confidence * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-slate-400">
                                                {Math.round(ann.confidence * 100)}%
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )
                        ) : mode === 'transcription' ? (
                            transcripts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8">
                                    <FileText className="mb-3 opacity-20" size={48} />
                                    <p className="text-sm">No transcripts. Use AI Transcribe.</p>
                                </div>
                            ) : (
                                transcripts.map((tr, i) => (
                                    <div
                                        key={tr.id}
                                        className="p-3 bg-white border border-slate-100 rounded-lg text-sm hover:shadow-sm transition-all"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="mt-0.5 flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-blue-200"
                                                onClick={() => {
                                                    setCurrentTime(tr.timestamp);
                                                    if (videoRef.current) videoRef.current.currentTime = tr.timestamp;
                                                }}
                                            >
                                                <Play size={10} fill="currentColor" />
                                            </div>
                                            <div className="flex-1">
                                                <span className="font-mono text-[10px] text-slate-400 block mb-1">
                                                    @{tr.timestamp.toFixed(2)}s
                                                </span>
                                                <p className="text-slate-700 leading-relaxed">{tr.text}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )
                        ) : (
                            generatedVideos.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8">
                                    <Sparkles className="mb-3 opacity-20" size={48} />
                                    <p className="text-sm">No generated videos yet.</p>
                                </div>
                            ) : (
                                generatedVideos.map((item, i) => {
                                    // Parse if it's a JSON string
                                    let parsed: any = null;
                                    try {
                                        parsed = JSON.parse(item);
                                    } catch {
                                        // It might be a direct URL string
                                        parsed = { videoUrl: item };
                                    }

                                    // Error case
                                    if (parsed?.error) {
                                        return (
                                            <div
                                                key={parsed.id || i}
                                                className="p-4 bg-red-50 border border-red-200 rounded-xl"
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <X size={14} className="text-red-600" />
                                                    <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Error</span>
                                                </div>
                                                <p className="text-xs font-medium text-slate-600 mb-2 italic">&quot;{parsed.prompt}&quot;</p>
                                                <p className="text-sm text-red-600">{parsed.error}</p>
                                            </div>
                                        );
                                    }

                                    // Video URL case - actual generated video
                                    if (parsed?.videoUrl) {
                                        const proxyUrl = `/api/video-proxy?url=${encodeURIComponent(parsed.videoUrl)}`;
                                        return (
                                            <div
                                                key={parsed.id || i}
                                                className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl shadow-sm"
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Sparkles size={14} className="text-purple-600" />
                                                    <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Video #{i + 1}</span>
                                                </div>
                                                {parsed.prompt && (
                                                    <p className="text-xs font-medium text-slate-600 mb-2 italic">&quot;{parsed.prompt}&quot;</p>
                                                )}
                                                <video
                                                    src={proxyUrl}
                                                    controls
                                                    className="w-full rounded-lg bg-black aspect-video"
                                                />
                                                <div className="mt-2 flex justify-between items-center">
                                                    <span className="text-[10px] text-slate-400">
                                                        {parsed.timestamp && new Date(parsed.timestamp).toLocaleTimeString()}
                                                    </span>
                                                    <a
                                                        href={proxyUrl}
                                                        download={`generated-video-${parsed.id || i}.mp4`}
                                                        className="text-purple-600 hover:text-purple-700"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Download size={14} />
                                                    </a>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Description fallback (legacy)
                                    if (parsed?.description) {
                                        return (
                                            <div
                                                key={parsed.id || i}
                                                className="p-4 bg-slate-50 border border-slate-200 rounded-xl"
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Sparkles size={14} className="text-slate-600" />
                                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Scene #{i + 1}</span>
                                                </div>
                                                <p className="text-xs font-medium text-slate-600 mb-2 italic">&quot;{parsed.prompt}&quot;</p>
                                                <p className="text-sm text-slate-700 leading-relaxed">{parsed.description.substring(0, 200)}...</p>
                                            </div>
                                        );
                                    }

                                    // Plain URL fallback
                                    return (
                                        <div
                                            key={i}
                                            className="p-2 bg-slate-50 border border-slate-200 rounded-lg"
                                        >
                                            <video src={item} controls className="w-full rounded-md bg-black aspect-video" />
                                            <div className="mt-2 flex justify-between items-center px-1">
                                                <span className="text-xs font-medium text-slate-600">Video #{i + 1}</span>
                                                <a href={item} download><Download size={14} className="text-slate-400 hover:text-purple-600" /></a>
                                            </div>
                                        </div>
                                    );
                                })
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
