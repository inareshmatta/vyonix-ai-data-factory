"use client";

import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Zap, Play, Pause, RotateCcw, Download, Tag, FileText, CheckCircle2, Video, Plus, X, Type, MousePointer2, Sparkles, Loader2 } from 'lucide-react';
// import { analyzeVideoWithGemini } from './actions'; // Dynamic import used instead to avoid build issues if mixed

export default function VideoStudio() {
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [duration, setDuration] = useState(0);

    // Modes
    const [mode, setMode] = useState<'detection' | 'transcription' | 'generation'>('detection');
    const [tool, setTool] = useState<'pointer' | 'box'>('pointer');

    // Generation State
    const [genPrompt, setGenPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

    // Data Structures
    const [annotations, setAnnotations] = useState<any[]>([]);
    const [transcripts, setTranscripts] = useState<any[]>([]);

    // Manual Annotation State
    const [isDrawing, setIsDrawing] = useState(false);
    const [boxStart, setBoxStart] = useState<{ x: number, y: number } | null>(null);
    const [tempBox, setTempBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

    const handleVideoUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const url = URL.createObjectURL(file);
                setVideoSrc(url);
                setVideoFile(file);
                setAnnotations([]);
                setTranscripts([]);
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
        if (videoRef.current) setDuration(videoRef.current.duration);
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
                prompt = `Analyze the video frame at timestamp ${currentTime.toFixed(2)}s. Detect the most prominent object. Return ONLY valid JSON: { "label": "string", "confidence": number, "box_2d": [ymin, xmin, ymax, xmax] }. Coordinates should be 0-1 fractions.`;
            } else {
                prompt = `Analyze the video segment around ${currentTime.toFixed(2)}s. Provide a concise transcription of the action and audio.`;
            }

            // Dynamically import to ensure server action is handled correctly by Next.js bundler
            const { analyzeVideoWithGemini } = await import('./actions');

            const result = await analyzeVideoWithGemini(base64Data, videoFile.type, prompt);

            if (result.error) {
                console.error("Analysis failed:", result.error);
                alert(`API Error: ${result.error}`);
                // Only simulate if API is completely unreachable, not on parse errors
            } else if (result.text) {
                const text = result.text;
                if (mode === 'detection') {
                    try {
                        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
                        const data = JSON.parse(jsonStr);

                        const newAnnotation = {
                            id: Date.now(),
                            timestamp: currentTime,
                            label: data.label || "Detected Object",
                            box: data.box_2d || [0.2, 0.2, 0.5, 0.5],
                            confidence: data.confidence || 0.95
                        };
                        setAnnotations(prev => [...prev, newAnnotation]);
                    } catch (e) {
                        // Parse failed - show raw text to user, don't simulate
                        console.warn("Could not parse JSON from API response. Raw text:", text);
                        alert(`AI returned non-JSON response. Raw: ${text.substring(0, 200)}...`);
                    }
                } else {
                    const newTranscript = {
                        id: Date.now(),
                        timestamp: currentTime,
                        text: text
                    };
                    setTranscripts(prev => [...prev, newTranscript]);
                }
            }

        } catch (error) {
            console.error("Gemini Execution Error:", error);
            alert(`Execution Error: ${error}`);
        }

        setIsProcessing(false);
    };

    const simulateDetection = () => {
        const newAnnotation = {
            id: Date.now(),
            timestamp: currentTime,
            label: "Manual/Auto Object",
            box: tempBox ? [tempBox.y / 100, tempBox.x / 100, (tempBox.y + tempBox.h) / 100, (tempBox.x + tempBox.w) / 100] : [0.3, 0.3, 0.6, 0.6],
            confidence: 0.99
        };
        setAnnotations(prev => [...prev, newAnnotation]);
    };

    const simulateTranscription = () => {
        const newTranscript = {
            id: Date.now(),
            timestamp: currentTime,
            text: "Gemini 3 Flash (Simulated): Complex industrial interaction detected with high precision."
        };
        setTranscripts(prev => [...prev, newTranscript]);
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
                x: Math.min(x, boxStart.x),
                y: Math.min(y, boxStart.y),
                w: Math.abs(x - boxStart.x),
                h: Math.abs(y - boxStart.y)
            });
        }
    };

    const handleMouseUp = () => {
        if (isDrawing && tempBox) {
            // Prompt user for label
            const label = prompt("Enter label for this object:", "New Object");
            if (label) {
                setAnnotations(prev => [...prev, {
                    id: Date.now(),
                    timestamp: currentTime,
                    label: label,
                    box: [tempBox.y, tempBox.x, tempBox.y + tempBox.h, tempBox.x + tempBox.w], // fraction relative format
                    confidence: 1.0,
                    manual: true
                }]);
            }
            setTempBox(null);
            setBoxStart(null);
            setIsDrawing(false);
            setTool('pointer'); // Reset tool
        }
    };

    const exportData = () => {
        const data = {
            metadata: {
                model: "Gemini 3 Flash",
                mode: mode,
                duration: duration,
                exported_at: new Date().toISOString()
            },
            data: mode === 'detection' ? annotations : transcripts
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vyonix_${mode}_export.json`;
        a.click();
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <span className="text-2xl">📹</span>
                    <div>
                        <h1 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            Video Intelligence Studio
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black tracking-widest uppercase border border-indigo-200">Gemini 3 Flash</span>
                        </h1>
                    </div>
                </div>

                {/* Mode Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                        onClick={() => setMode('detection')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${mode === 'detection' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Tag size={14} /> Detection
                    </button>
                    <button
                        onClick={() => setMode('transcription')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${mode === 'transcription' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <FileText size={14} /> Transcription
                    </button>
                    <button
                        onClick={() => setMode('generation')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${mode === 'generation' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Sparkles size={14} /> Generate
                    </button>
                </div>

                <div className="flex gap-3">
                    <button onClick={handleVideoUpload} className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-all">
                        <UploadCloud size={16} /> Upload
                    </button>
                    <button onClick={exportData} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-slate-900/20 transition-all">
                        <Download size={16} /> Export JSON
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden p-6 gap-6">
                {/* Main Viewport */}
                <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative group">
                    {/* Toolbar for Manual Annotation */}
                    {mode === 'detection' && videoSrc && (
                        <div className="absolute top-4 left-4 z-30 bg-white/90 backdrop-blur border border-slate-200 p-1 rounded-xl shadow-lg flex flex-col gap-1">
                            <button
                                onClick={() => setTool('pointer')}
                                className={`p-2 rounded-lg transition-colors ${tool === 'pointer' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
                                title="Pointer"
                            >
                                <MousePointer2 size={18} />
                            </button>
                            <button
                                onClick={() => setTool('box')}
                                className={`p-2 rounded-lg transition-colors ${tool === 'box' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
                                title="Draw Bounding Box"
                            >
                                <div className="w-4 h-4 border-2 border-current rounded-sm" />
                            </button>
                        </div>
                    )}

                    {videoSrc ? (
                        <>
                            <div
                                className={`flex-1 bg-black relative flex items-center justify-center overflow-hidden ${tool === 'box' ? 'cursor-crosshair' : 'cursor-default'}`}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                            >
                                <video
                                    ref={videoRef}
                                    src={videoSrc}
                                    className="max-h-full max-w-full pointer-events-none" // Disable pointer events on video to allow drawing on container
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadedMetadata={handleLoadedMetadata}
                                />

                                {/* Drawing Overlay */}
                                {tempBox && (
                                    <div
                                        className="absolute border-2 border-emerald-500 bg-emerald-500/20"
                                        style={{
                                            left: `${tempBox.x}%`,
                                            top: `${tempBox.y}%`,
                                            width: `${tempBox.w}%`,
                                            height: `${tempBox.h}%`
                                        }}
                                    />
                                )}

                                {/* Annotations Overlay */}
                                {mode === 'detection' && annotations.map(ann => {
                                    // Only show annotations near current time (+/- 1s)
                                    if (Math.abs(ann.timestamp - currentTime) < 1) {
                                        const [y, x, y2, x2] = ann.box; // Expecting [ymin, xmin, ymax, xmax] as fractions or [y, x, y+h, x+w] fractions

                                        const style = ann.manual
                                            ? { top: `${y}%`, left: `${x}%`, height: `${y2 - y}%`, width: `${x2 - x}%` }
                                            : { top: `${y * 100}%`, left: `${x * 100}%`, height: `${(y2 - y) * 100}%`, width: `${(x2 - x) * 100}%` };

                                        return (
                                            <div
                                                key={ann.id}
                                                className={`absolute border-2 ${ann.manual ? 'border-emerald-500' : 'border-indigo-500'} group/box`}
                                                style={style}
                                            >
                                                <span className={`absolute -top-6 left-0 text-xs font-bold px-2 py-0.5 rounded ${ann.manual ? 'bg-emerald-500' : 'bg-indigo-500'} text-white whitespace-nowrap`}>
                                                    {ann.label} {ann.confidence < 1 && `(${(ann.confidence * 100).toFixed(0)}%)`}
                                                </span>
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </div>

                            {/* Controls */}
                            <div className="h-20 bg-white border-t border-slate-100 px-6 flex items-center gap-4 z-20">
                                <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors">
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
                                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                    <div className="flex justify-between text-xs font-mono text-slate-400 mt-1">
                                        <span>{currentTime.toFixed(2)}s</span>
                                        <span>{duration.toFixed(2)}s</span>
                                    </div>
                                </div>

                                <button
                                    onClick={analyzeSegment}
                                    disabled={isProcessing}
                                    className={`px-6 py-2 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center gap-2 ${mode === 'detection'
                                        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                                        }`}
                                >
                                    {isProcessing ? <RotateCcw className="animate-spin" size={16} /> : <Zap size={16} />}
                                    {mode === 'detection' ? 'AI Auto-Detect' : 'AI Transcribe'}
                                </button>
                            </div>
                        </>
                    ) : mode === 'generation' ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-600">
                            <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-lg p-8">
                                <div className="text-center mb-6">
                                    <Sparkles size={40} className="mx-auto text-violet-500 mb-4" />
                                    <h2 className="text-2xl font-black text-slate-800">Veo 3.1 Video Generation</h2>
                                    <p className="text-sm text-slate-500 mt-2">Create synthetic training videos from text descriptions</p>
                                </div>

                                <textarea
                                    value={genPrompt}
                                    onChange={(e) => setGenPrompt(e.target.value)}
                                    placeholder="Describe the video you want to generate... (e.g., 'A person walking through a busy street, daylight, urban environment')"
                                    className="w-full h-32 p-4 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                />

                                <button
                                    onClick={async () => {
                                        if (!genPrompt.trim()) return alert('Please enter a prompt');
                                        setIsGenerating(true);
                                        try {
                                            const { generateVideoWithVeo } = await import('./videoGenActions');
                                            const result = await generateVideoWithVeo(genPrompt);
                                            if (result.error) {
                                                alert(`Generation Error: ${result.error}`);
                                            } else if (result.videoUrl) {
                                                setGeneratedVideoUrl(result.videoUrl);
                                                alert('Video generated! Check the preview below.');
                                            }
                                        } catch (e: any) {
                                            alert(`Error: ${e.message}`);
                                        }
                                        setIsGenerating(false);
                                    }}
                                    disabled={isGenerating || !genPrompt.trim()}
                                    className="w-full mt-4 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                    {isGenerating ? 'Generating (this takes ~2 min)...' : 'Generate Synthetic Video'}
                                </button>

                                {generatedVideoUrl && (
                                    <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                        <p className="text-sm font-bold text-emerald-700 mb-2">✓ Video Generated</p>
                                        <a href={generatedVideoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline break-all">
                                            {generatedVideoUrl}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
                                <Video size={32} className="opacity-50" />
                            </div>
                            <p className="font-medium">Upload a video to begin annotation</p>
                        </div>
                    )}
                </div>

                {/* Sidebar Panel */}
                <div className="w-80 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
                            {mode === 'detection' ? 'Objects' : 'Transcripts'}
                        </h3>
                        {mode === 'detection' && <span className="text-xs font-bold text-slate-400">{annotations.length} items</span>}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {mode === 'detection' ? (
                            annotations.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center mt-10">No objects. Use the Draw tool or AI Auto-Detect.</p>
                            ) : (
                                annotations.sort((a, b) => a.timestamp - b.timestamp).map((ann, i) => (
                                    <div
                                        key={ann.id}
                                        onClick={() => {
                                            setCurrentTime(ann.timestamp);
                                            if (videoRef.current) videoRef.current.currentTime = ann.timestamp;
                                        }}
                                        className={`p-3 rounded-xl border transition-colors cursor-pointer group ${Math.abs(ann.timestamp - currentTime) < 1
                                            ? 'bg-indigo-100 border-indigo-200'
                                            : 'bg-indigo-50 border-indigo-100 hover:bg-indigo-100'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-black text-indigo-400 uppercase tracking-wider">{ann.timestamp.toFixed(2)}s</span>
                                            {ann.manual && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-bold uppercase">Manual</span>}
                                        </div>
                                        <p className="text-sm font-bold text-indigo-900">{ann.label}</p>
                                    </div>
                                ))
                            )
                        ) : (
                            transcripts.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center mt-10">No transcripts generated yet.</p>
                            ) : (
                                transcripts.map((tr, i) => (
                                    <div key={tr.id} className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors">
                                        <div className="mb-2">
                                            <span className="text-xs font-black text-emerald-500 uppercase tracking-wider bg-white/50 px-2 py-0.5 rounded">{tr.timestamp.toFixed(2)}s</span>
                                        </div>
                                        <p className="text-sm font-medium text-emerald-900 leading-relaxed">
                                            "{tr.text}"
                                        </p>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
