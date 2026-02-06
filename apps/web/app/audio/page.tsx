// System Sync: 2026-02-05
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    UploadCloud,
    Download,
    Clock,
    Plus,
    Save,
    X,
    Edit2,
    Trash2,
    Mic,
    Play,
    Pause,
    SkipBack,
    FastForward,
    Rewind,
    List,
    History,
    CheckCircle2,
    Database,
    Check,
    Cloud,
    MessageSquare,
    Zap,
    Coins,
    Sparkles
} from 'lucide-react';
import { trackUsage } from '@/lib/usage';
import WavesurferPlayer from '@wavesurfer/react';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js';

// Types
interface AudioSegment {
    id: number;
    start: number;
    end: number;
    speaker: string;
    word: string;
    type: 'lexical' | 'filler' | 'event';
    tags?: string; // Added for manual tagging
}

interface JobHistory {
    id: string;
    originalName: string;
    timestamp: string;
    status: string;
}

interface QueueItem {
    id: string;
    file: File;
    status: 'pending' | 'processing' | 'completed' | 'error';
    result?: any;
    errorMsg?: string;
    batchJobId?: string; // Added to track batch job association
}

// Formats milliseconds to HH:MM:SS.mmm
const formatMs = (ms: number): string => {
    if (isNaN(ms)) return "00:00:00.000";
    const totalSeconds = ms / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor(ms % 1000);

    const pad = (n: number, len: number = 2) => n.toString().padStart(len, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(milliseconds, 3)}`;
};

const parseTimeToMs = (timeStr: string): number => {
    try {
        const parts = timeStr.split(':');
        if (parts.length < 3) return 0;
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const secondsParts = parts[2].split('.');
        const seconds = parseInt(secondsParts[0]) || 0;
        const ms = secondsParts[1] ? parseInt(secondsParts[1].padEnd(3, '0').slice(0, 3)) : 0;
        return (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + ms;
    } catch (e) {
        return 0;
    }
};

const Badge = ({ type }: { type: string }) => {
    const styles: { [key: string]: string } = {
        lexical: "bg-slate-100 text-slate-600 border-slate-200",
        filler: "bg-amber-50 text-amber-600 border-amber-200",
        event: "bg-purple-50 text-purple-600 border-purple-200",
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${styles[type] || styles.lexical}`}>
            {type}
        </span>
    );
};

export default function AudioStudio() {
    // State
    const [data, setData] = useState<AudioSegment[]>([]);
    const [history, setHistory] = useState<JobHistory[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<AudioSegment>>({});

    // Playback
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    // Status
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false); // Renamed from isBatchProcessing for single file
    const [isBatchProcessing, setIsBatchProcessing] = useState(false); // New state for batch job submission
    const [batchJobs, setBatchJobs] = useState<any[]>([]); // Track batch jobs from API
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);

    const [promptVersion, setPromptVersion] = useState<'v1' | 'v2' | 'v3' | 'v4'>('v1');
    const [taskType, setTaskType] = useState<'word' | 'sentence'>('word'); // Added taskType state



    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const wavesurferRef = useRef<any>(null);
    const regionsRef = useRef<any>(null);

    // Waveform State
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [audioDuration, setAudioDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    // Memoize plugins to prevent re-renders (only on client)
    const wavesurferPlugins = useMemo(() => {
        if (typeof window === 'undefined') return [];
        return [TimelinePlugin.create()];
    }, []);

    // Feature State
    const [showSentiment, setShowSentiment] = useState(false);
    const [showTTS, setShowTTS] = useState(false);
    const [sentimentResult, setSentimentResult] = useState<any>(null);
    const [ttsText, setTtsText] = useState("");
    const [selectedVoice, setSelectedVoice] = useState("Puck");
    const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [generatedTTS, setGeneratedTTS] = useState<{ url: string, filename: string, file: File } | null>(null);

    // Fetch history on load
    useEffect(() => {
        fetchHistory(); // Initial fetch
        const interval = setInterval(fetchHistory, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/history');
            if (res.ok) {
                const json = await res.json();
                setHistory(json);
            }
        } catch (e) {
            // Suppress polling errors to avoid console noise
            // console.error("History fetch failed", e); 
        }
    };

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [queue, setQueue] = useState<QueueItem[]>([]);

    // Batch Polling Effect
    useEffect(() => {
        const activeBatchJobs = [...new Set(queue.filter(q => q.status === 'processing' && q.batchJobId).map(q => q.batchJobId))];

        if (activeBatchJobs.length === 0) return;

        const pollInterval = setInterval(async () => {
            for (const jobId of activeBatchJobs) {
                try {
                    const res = await fetch(`/api/ai/audio/batch/status?id=${jobId}`);
                    const data = await res.json();

                    if (data.state === 'SUCCEEDED') {
                        // Update queue items
                        setQueue(prev => prev.map(item => {
                            if (item.batchJobId === jobId) {
                                // Match by filename if possible
                                const result = data.results.find((r: any) => r.fileName === item.file.name);
                                if (result) {
                                    return {
                                        ...item,
                                        status: 'completed',
                                        result: {
                                            // Format timestamps back to MS
                                            data: result.annotations.map((a: any) => ({
                                                ...a,
                                                start: parseTimeToMs(a.start),
                                                end: parseTimeToMs(a.end)
                                            }))
                                        }
                                    };
                                }
                                return { ...item, status: 'completed', errorMsg: "Result not found in batch" };
                            }
                            return item;
                        }));
                        setStatusMessage(`Batch Job ${jobId} Completed!`);
                    } else if (data.state === 'FAILED') {
                        setQueue(prev => prev.map(item =>
                            item.batchJobId === jobId ? { ...item, status: 'error', errorMsg: data.error?.message || "Batch failed" } : item
                        ));
                        setStatusMessage(`Batch Job ${jobId} Failed`);
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }
        }, 10000); // Poll every 10s for batch

        return () => clearInterval(pollInterval);
    }, [queue]);
    // const [isBatchProcessing, setIsBatchProcessing] = useState(false); // This was duplicated, removed

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const fileList = Array.from(files).slice(0, 10);

        const newItems: QueueItem[] = fileList.map(f => ({
            id: Math.random().toString(36).substr(2, 9),
            file: f,
            status: 'pending'
        }));

        setQueue(prev => [...prev, ...newItems]);

        // Auto-select the first of the newly added files
        const firstFile = fileList[0];
        setAudioUrl(URL.createObjectURL(firstFile));
        setSelectedFile(firstFile);
        setData([]);
        setCurrentJobId(null);
        setIsPlayerReady(false);
        setStatusMessage(null);
        setSentimentResult(null);

        // Reset input so same file can be picked again
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        const fileList = Array.from(files).filter(f => f.type.startsWith('audio/')).slice(0, 10);
        if (fileList.length === 0) return;

        const newItems: QueueItem[] = fileList.map(f => ({
            id: Math.random().toString(36).substr(2, 9),
            file: f,
            status: 'pending'
        }));

        setQueue(prev => [...prev, ...newItems]);

        const firstFile = fileList[0];
        setAudioUrl(URL.createObjectURL(firstFile));
        setSelectedFile(firstFile);
        setData([]);
        setCurrentJobId(null);
        setIsPlayerReady(false);
        setSentimentResult(null);
    };

    const handleStartBatchProcess = async () => {
        const pendingItems = queue.filter(item => item.status === 'pending');
        if (pendingItems.length === 0) return;

        setIsBatchProcessing(true);
        setStatusMessage("Initializing Batch Job (Saving 50% API Cost)...");

        try {
            const formData = new FormData();
            pendingItems.forEach(item => {
                formData.append('files', item.file);
            });
            formData.append('promptVersion', promptVersion);
            formData.append('taskType', taskType);

            const response = await fetch('/api/ai/audio/batch', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (response.ok) {
                // Update queue items to "processing"
                setQueue(prev => prev.map(item =>
                    pendingItems.find(p => p.id === item.id)
                        ? { ...item, status: 'processing', batchJobId: result.batchJobId }
                        : item
                ));
                setStatusMessage(`Batch Job Submitted: ${result.batchJobId}`);
                // Refresh history or jobs list if needed
            } else {
                setStatusMessage(`Batch Submission Failed: ${result.error}`);
            }
        } catch (error) {
            console.error("Batch error:", error);
            setStatusMessage("Error submitting batch job");
        } finally {
            setIsBatchProcessing(false);
        }
    };

    const handleStartProcess = async () => { // Renamed from handleTranscribe
        if (queue.length === 0) return;
        setIsProcessing(true); // Changed to isProcessing

        const currentQueue = [...queue];

        const isBatch = currentQueue.length > 1;

        for (let i = 0; i < currentQueue.length; i++) {
            const item = currentQueue[i];
            if (item.status === 'completed') continue;

            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'processing' } : q));

            if (isBatch) setStatusMessage(`Processing batch ${i + 1}/${currentQueue.length}: ${item.file.name}...`);
            else setStatusMessage("Reading audio file...");

            try {
                // Get Duration
                const durationSeconds = await new Promise<number>((resolve) => {
                    const audio = new Audio(URL.createObjectURL(item.file));
                    audio.onloadedmetadata = () => resolve(audio.duration);
                    audio.onerror = () => resolve(0);
                });
                const formattedDuration = formatMs(durationSeconds * 1000);

                const formData = new FormData();
                formData.append("file", item.file);
                formData.append("promptVersion", promptVersion);
                formData.append("taskType", taskType); // Changed to use taskType state
                formData.append("duration", formattedDuration);

                if (item.file.size > 5 * 1024 * 1024) {
                    if (isBatch) setStatusMessage(`Processing batch ${i + 1}/${currentQueue.length}: Uploading large file...`);
                    else setStatusMessage("Uploading large file & Analyzing speech patterns...");
                } else if (!isBatch) {
                    setStatusMessage("Analyzing speech patterns...");
                }

                const response = await fetch('/api/ai/audio', {
                    method: 'POST',
                    body: formData,
                });

                if (!isBatch) setStatusMessage("Generating transcript...");

                const result = await response.json();

                if (response.ok && result.data) {
                    const segments = result.data.map((seg: any) => ({
                        ...seg,
                        start: typeof seg.start === 'number' ? seg.start : 0,
                        end: typeof seg.end === 'number' ? seg.end : (seg.start ? seg.start + 300 : 0),
                    }));

                    setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'completed', result: { ...result, data: segments } } : q));

                    // Track Usage
                    trackUsage({
                        audio_files: 1,
                        audio_seconds: durationSeconds,
                        tokens_input: Math.floor(durationSeconds * 100), // audio tokens are heavy
                        tokens_output: JSON.stringify(segments).length / 4
                    });

                    if (item.file === selectedFile) {
                        setData(segments);
                        setCurrentJobId(result.jobId);

                        if (regionsRef.current) {
                            regionsRef.current.clearRegions();
                            try {
                                segments.forEach((seg: AudioSegment) => {
                                    regionsRef.current.addRegion({
                                        id: seg.id.toString(),
                                        start: seg.start / 1000,
                                        end: seg.end / 1000,
                                        color: 'rgba(59, 130, 246, 0.2)',
                                        drag: false,
                                        resize: false
                                    });
                                });
                            } catch (e) { console.error(e); }
                        }
                    }
                } else {
                    throw new Error(result.error || "Unknown error");
                }
            } catch (error: any) {
                console.error("Transcribe error", error);
                setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', errorMsg: error.message } : q));
            }
        }

        setIsProcessing(false);
        setStatusMessage(null);
        fetchHistory();
    };

    const handleSentimentAnalysis = async () => {
        if (!selectedFile) {
            alert("No audio file selected for analysis");
            return;
        }

        setStatusMessage("Performing Multimodal Sentiment Analysis (Gemini 3 Flash)...");
        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("prompt", "Perform a deep multi-segmented emotional audit. Break down the audio into meaningful segments and provide a creative transcription that captures tone and nuance.");

            const response = await fetch('/api/ai/audio/sentiment', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (response.ok) {
                setSentimentResult(result);
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (e) {
            alert("Sentiment analysis failed");
        } finally {
            setStatusMessage(null);
        }
    };

    const handleGenerateTTS = async () => {
        if (!ttsText) return;
        setIsGeneratingTTS(true);
        setStatusMessage("Generating Synthetic Voice (Gemini 2.5 Flash TTS)...");
        setGeneratedTTS(null);

        try {
            const response = await fetch('/api/ai/audio/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: ttsText, voice: selectedVoice })
            });
            const result = await response.json();

            if (response.ok && (result.success || result.audioBase64)) {
                let blob;
                if (result.audioBase64) {
                    // Convert Base64 to Blob
                    const byteCharacters = atob(result.audioBase64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    blob = new Blob([byteArray], { type: result.mimeType || 'audio/wav' });
                } else if (result.audioUrl) {
                    // Fallback for legacy file URL (dev mode)
                    const res = await fetch(result.audioUrl);
                    blob = await res.blob();
                }

                if (blob) {
                    const blobUrl = URL.createObjectURL(blob);
                    const file = new File([blob], result.filename, { type: result.mimeType || 'audio/wav' });

                    setGeneratedTTS({
                        url: blobUrl,
                        filename: result.filename,
                        file: file
                    });

                    setStatusMessage("Audio Generated Successfully!");
                }
            } else {
                alert(`TTS Failed: ${result.error}`);
            }
        } catch (e) {
            alert("TTS Error");
        } finally {
            setIsGeneratingTTS(false);
            setTimeout(() => setStatusMessage(null), 3000);
        }
    };

    const handlePushToQueue = () => {
        if (!generatedTTS) return;

        const newItem: QueueItem = {
            id: Math.random().toString(36).substr(2, 9),
            file: generatedTTS.file,
            status: 'pending'
        };
        setQueue(prev => [...prev, newItem]);

        // Option to switch to it immediately
        setAudioUrl(generatedTTS.url);
        setSelectedFile(generatedTTS.file);

        setShowTTS(false);
        setGeneratedTTS(null);
    };


    const handleDownloadZip = () => {
        if (!currentJobId) return;
        window.open(`/api/history/${currentJobId}/download`, '_blank');
    };

    // --- Wavesurfer Handlers ---
    const onReady = useCallback((ws: any) => {
        console.log("Wavesurfer onReady called! Duration:", ws.getDuration());
        wavesurferRef.current = ws;
        setIsPlaying(false);
        setIsPlayerReady(true);
        setAudioDuration(ws.getDuration());
        setCurrentTime(0);

        // Listen for time updates
        ws.on('audioprocess', (time: number) => setCurrentTime(time));
        ws.on('seeking', (time: number) => setCurrentTime(time));

        // Register regions plugin
        try {
            const wsRegions = ws.registerPlugin(RegionsPlugin.create());
            regionsRef.current = wsRegions;

            wsRegions.on('region-clicked', (region: any, e: any) => {
                e.stopPropagation();
                setEditingId(parseInt(region.id));
            });
        } catch (e) {
            console.warn("Regions plugin error:", e);
        }
    }, []);

    const onPlayPause = () => {
        if (wavesurferRef.current) {
            wavesurferRef.current.playPause();
            // State update is handled by event listeners in onReady
        } else {
            console.warn("Wavesurfer instance not found");
        }
    };

    // --- Editor Handlers ---
    const handleAddSegment = () => {
        // If region selected, use its time
        let start = 0, end = 1000;
        if (wavesurferRef.current) {
            const currentTime = wavesurferRef.current.getCurrentTime();
            start = currentTime * 1000;
            end = (currentTime + 1) * 1000;
        }

        const newId = data.length > 0 ? Math.max(...data.map(d => d.id)) + 1 : 1;
        const newSegment: AudioSegment = {
            id: newId,
            start, end,
            speaker: "Speaker 1",
            word: "",
            type: "lexical",
            tags: ""
        };

        // Add and sort by start time
        const newData = [...data, newSegment].sort((a, b) => a.start - b.start);
        setData(newData);
        setEditingId(newId);
        setEditFormData(newSegment);

        // Add visual region
        if (regionsRef.current) {
            regionsRef.current.addRegion({
                id: newId.toString(),
                start: start / 1000,
                end: end / 1000,
                color: 'rgba(34, 197, 94, 0.3)'
            });
        }
    };

    const handleFormChange = (field: keyof AudioSegment, value: any) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveClick = () => {
        if (editingId === null) return;
        const updatedSegment = editFormData as AudioSegment;

        // Update and Sort
        const newData = data.map(item => item.id === editingId ? updatedSegment : item)
            .sort((a, b) => a.start - b.start);

        setData(newData);
        setEditingId(null);

        // Update region
        if (regionsRef.current) {
            // Re-draw regions (simple way)
            // ideally update specific region
        }

        // PERSISTENCE FIX: Update the queue item as well so tags are saved!
        setQueue(prev => prev.map(item => {
            if (item.file === selectedFile) {
                // If the item has a 'result' object, update its data
                if (item.result) {
                    return {
                        ...item,
                        result: {
                            ...item.result,
                            data: newData
                        }
                    };
                }
            }
            return item;
        }));
    };

    const handleDeleteClick = (id: number) => {
        setData(prev => prev.filter(i => i.id !== id));
    };

    const handleSpeedChange = (rate: number) => {
        setPlaybackRate(rate);
        if (wavesurferRef.current) {
            wavesurferRef.current.setPlaybackRate(rate);
        }
    };

    return (
        <div
            className={`h-full flex flex-col gap-4 relative ${isDragging ? 'bg-blue-50/50' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="audio/*"
                multiple
                className="hidden"
            />

            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-[100] bg-blue-600/10 backdrop-blur-sm border-4 border-dashed border-blue-500 rounded-3xl flex flex-col items-center justify-center pointer-events-none">
                    <UploadCloud size={64} className="text-blue-600 animate-bounce mb-4" />
                    <h2 className="text-2xl font-black text-blue-700">Drop Audio to Process</h2>
                    <p className="text-blue-500 font-medium">Capture intelligence from sound waves</p>
                </div>
            )}

            {/* Top Bar */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Mic className="text-blue-600" size={24} />
                        Audio Studio Pro
                    </h2>
                    <p className="text-slate-500 text-sm">
                        {statusMessage ? (
                            <span className="text-blue-600 font-bold animate-pulse">{statusMessage}</span>
                        ) : (
                            "AI-Powered High Precision Annotation"
                        )}
                    </p>
                </div>

                <div className="flex gap-4 items-center">
                    {/* Prompt Selector */}
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setPromptVersion('v1')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${promptVersion === 'v1' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            V1 Agent
                        </button>
                        <button
                            onClick={() => setPromptVersion('v2')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${promptVersion === 'v2' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            V2 Agent
                        </button>
                        <button
                            onClick={() => setPromptVersion('v3')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${promptVersion === 'v3' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            V3 Agent
                        </button>
                        <button
                            onClick={() => setPromptVersion('v4')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${promptVersion === 'v4' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            V4 Agent
                        </button>
                    </div>

                    <button onClick={handleFileSelect} disabled={!!statusMessage}
                        className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm">
                        <UploadCloud size={16} /> Select File
                    </button>

                    {selectedFile && !statusMessage && (
                        <button onClick={handleStartProcess}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm animate-pulse">
                            <Mic size={16} /> {queue.length > 1 ? `Sequential Process (${queue.length})` : "Start Agent"}
                        </button>
                    )}

                    {statusMessage && (
                        <span className='text-sm text-blue-600 font-medium animate-pulse flex items-center gap-2'>
                            <Clock size={14} /> {statusMessage}
                        </span>
                    )}
                    {currentJobId && (
                        <button onClick={handleDownloadZip}
                            className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm">
                            <Download size={16} /> Download ZIP
                        </button>
                    )}

                    {/* New Feature Buttons */}
                    <button onClick={() => setShowSentiment(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-sm">
                        <Sparkles size={16} /> Sentiment
                    </button>
                    <button onClick={() => setShowTTS(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-sm">
                        <Zap size={16} /> TTS
                    </button>
                </div>
            </div>

            {/* Sliding Panels Overlay Container - "Canvas Feel" */}
            {/* Sentiment Panel */}
            <div className={`fixed inset-x-0 bottom-0 z-50 bg-white shadow-2xl rounded-t-3xl transition-transform duration-500 ease-in-out border-t border-slate-200 ${showSentiment ? 'translate-y-0' : 'translate-y-full'}`} style={{ height: '85vh' }}>
                <div className="p-6 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-pink-100 rounded-2xl text-pink-600"><Sparkles size={24} /></div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800">Transcript Sentiment Analysis</h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-slate-500 text-sm italic">
                                        {selectedFile ? `Active File: ${selectedFile.name}` : "Advanced Emotional Audit"}
                                    </p>
                                    {selectedFile && (
                                        <button onClick={handleFileSelect} className="text-[10px] font-bold text-pink-500 hover:text-pink-600 uppercase tracking-widest border-b border-pink-500/30">Change</button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {statusMessage && (
                                <div className="px-4 py-1.5 bg-pink-50 border border-pink-100 rounded-full text-[10px] font-black text-pink-600 uppercase animate-pulse flex items-center gap-2">
                                    <Clock size={12} /> {statusMessage}
                                </div>
                            )}
                            <button onClick={() => setShowSentiment(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto flex gap-6">
                        {/* Overall Sentiment Insight */}
                        <div className="w-80 space-y-4 shrink-0">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 h-full flex flex-col justify-center items-center text-center shadow-inner">
                                {sentimentResult ? (
                                    <>
                                        <div className="text-8xl mb-4 animate-in zoom-in drop-shadow-xl">{sentimentResult.overall?.emoji}</div>
                                        <h4 className="text-3xl font-black text-slate-800 mb-1">{sentimentResult.overall?.sentiment}</h4>
                                        <div className="text-[10px] font-black bg-white border border-slate-200 px-3 py-1 rounded-full uppercase tracking-tighter mb-6 text-slate-500 shadow-sm">Audit Score: {sentimentResult.overall?.score}%</div>

                                        <div className="w-full space-y-2 text-left bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                <span>Tone Archetype</span>
                                                <span className="text-pink-600">{sentimentResult.overall?.tone}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-pink-500 transition-all duration-1000" style={{ width: `${sentimentResult.overall?.score}%` }}></div>
                                            </div>
                                        </div>

                                        <p className="mt-6 text-sm text-slate-600 leading-relaxed font-medium bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                            <span className="text-pink-500 text-2xl font-serif mr-1">“</span>
                                            {sentimentResult.overall?.summary}
                                            <span className="text-pink-500 text-2xl font-serif ml-1">”</span>
                                        </p>

                                        <button
                                            onClick={handleSentimentAnalysis}
                                            disabled={!!statusMessage}
                                            className="mt-6 text-[10px] font-black text-pink-600 hover:text-pink-700 uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            <Sparkles size={12} /> {statusMessage ? "Analyzing..." : "Re-analyze Audio Context"}
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-slate-400">
                                        <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Sparkles size={40} className="text-pink-400 opacity-50" />
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-800 mb-2">Multimodal Audit</h4>
                                        <p className="text-xs font-medium px-4 leading-relaxed">Gemini will analyze the actual audio waves to detect nuanced emotional shifts.</p>
                                        <button
                                            onClick={selectedFile ? handleSentimentAnalysis : handleFileSelect}
                                            disabled={!!statusMessage}
                                            className="mt-8 bg-slate-900 text-white px-10 py-3 rounded-xl font-bold shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2 mx-auto disabled:opacity-50"
                                        >
                                            {statusMessage ? (
                                                <span className="animate-spin text-lg">⏳</span>
                                            ) : selectedFile ? (
                                                <Sparkles size={18} />
                                            ) : (
                                                <UploadCloud size={18} />
                                            )}
                                            {selectedFile ? "Analyze Audio Now" : "Select Audio to Analyze"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Segmented Breakdown */}
                        <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 bg-white py-2 z-10 flex justify-between items-center">
                                <span>Segmented Intelligence</span>
                                <span className="text-slate-300 font-mono">{sentimentResult?.segments?.length || 0} Emotional Anchors</span>
                            </h4>
                            {sentimentResult?.segments ? (
                                <div className="space-y-3">
                                    {sentimentResult.segments.map((seg: any, idx: number) => (
                                        <div key={idx} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:border-pink-200 transition-colors group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded italic">
                                                        {seg.start} - {seg.end}
                                                    </span>
                                                    <span className="text-xs font-bold text-pink-600 uppercase tracking-wider bg-pink-50 px-2 py-0.5 rounded flex items-center gap-1">
                                                        <span>{seg.emoji}</span>
                                                        <span>{seg.sentiment}</span>
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-700 leading-relaxed italic">
                                                {seg.transcript}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-64 border-2 border-dashed border-slate-100 rounded-3xl flex items-center justify-center text-slate-300 text-sm font-medium">
                                    Awaiting segmented insights...
                                </div>
                            )}
                        </div>

                        {/* Full Creative Transcript */}
                        <div className="w-80 bg-slate-900 rounded-3xl p-6 text-white text-xs leading-relaxed overflow-auto relative shrink-0 shadow-2xl">
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Creative Transcript</span>
                                <div className="p-1.5 bg-white/10 rounded-lg text-white/40"><MessageSquare size={14} /></div>
                            </div>
                            <div className="font-mono text-slate-300 space-y-4 whitespace-pre-wrap leading-loose">
                                {sentimentResult?.fullTranscript ? (
                                    <div className="animate-in fade-in duration-1000 tracking-tight">
                                        {sentimentResult.fullTranscript.split('\n').map((line: string, i: number) => {
                                            const isSpeaker = line.includes(':') && line.split(':')[0].length < 20;
                                            if (isSpeaker) {
                                                const [name, ...content] = line.split(':');
                                                return (
                                                    <div key={i} className="mb-4">
                                                        <span className="text-pink-500 font-black uppercase text-[10px] tracking-widest block mb-1 opacity-80">{name}</span>
                                                        <span className="text-slate-100">{content.join(':')}</span>
                                                    </div>
                                                );
                                            }
                                            return <p key={i} className="mb-2">{line}</p>;
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-slate-600 italic">
                                        No transcript data available. Run analysis to generate context.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TTS Panel */}
            <div className={`fixed inset-x-0 bottom-0 z-50 bg-white shadow-2xl rounded-t-3xl transition-transform duration-500 ease-in-out border-t border-slate-200 ${showTTS ? 'translate-y-0' : 'translate-y-full'}`} style={{ height: '85vh' }}>
                <div className="p-6 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-violet-100 rounded-2xl text-violet-600"><Zap size={24} /></div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800">Synthetic Voice Generation (TTS)</h3>
                                <p className="text-slate-500 text-sm">Powered by Gemini 2.5 Flash Preview TTS</p>
                            </div>
                        </div>
                        <button onClick={() => setShowTTS(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
                    </div>

                    <div className="flex-1 flex gap-12 max-w-6xl mx-auto w-full">
                        <div className="flex-1 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Text to Synthesize</label>
                                <textarea
                                    value={ttsText}
                                    onChange={(e) => setTtsText(e.target.value)}
                                    placeholder="Enter text to convert to speech..."
                                    className="w-full h-64 bg-slate-50 border border-slate-200 rounded-xl p-4 focus:ring-2 focus:ring-violet-500 outline-none resize-none text-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Voice Model</label>
                                <div className="grid grid-cols-4 gap-4">
                                    {['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'].map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setSelectedVoice(v)}
                                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${selectedVoice === v ? 'bg-violet-600 text-white border-violet-600 shadow-lg' : 'bg-white border-slate-200 hover:border-violet-300'}`}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="w-96 flex flex-col justify-center space-y-6">
                            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 text-center">
                                <div className="w-24 h-24 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Mic size={40} className="text-violet-600" />
                                </div>

                                {generatedTTS ? (
                                    <div className="space-y-4 animate-in zoom-in">
                                        <h4 className="text-xl font-bold text-slate-800">Success!</h4>
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                            <audio controls className="w-full h-10 mb-4" src={generatedTTS.url}>
                                                Your browser does not support the audio element.
                                            </audio>
                                            <div className="flex gap-2">
                                                <a
                                                    href={generatedTTS.url}
                                                    download={generatedTTS.filename}
                                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    <Download size={14} /> Download
                                                </a>
                                                <button
                                                    onClick={handlePushToQueue}
                                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg"
                                                >
                                                    <List size={14} /> Push to Queue
                                                </button>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setGeneratedTTS(null)}
                                            className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                                        >
                                            Generate Another
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <h4 className="text-xl font-bold text-slate-800 mb-2">Ready to Generate</h4>
                                        <p className="text-slate-500 text-sm mb-8">This will synthesize high-quality speech. You can then preview, download, or manually add it to the transcription queue.</p>

                                        <button
                                            onClick={handleGenerateTTS}
                                            disabled={!ttsText || isGeneratingTTS}
                                            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isGeneratingTTS ? <span className="animate-spin">⏳</span> : <Zap size={20} />}
                                            {isGeneratingTTS ? "Synthesizing Core Audio..." : "Generate Audio"}
                                        </button>
                                        {!isGeneratingTTS && (
                                            <button onClick={handleFileSelect} className="mt-4 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center justify-center gap-2 mx-auto">
                                                <UploadCloud size={12} /> Or Upload Sample for Reference
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Workspace Grid */}
            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">

                {/* Left: Player & History */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 min-h-0 overflow-y-auto">

                    {/* Visual Player Card */}
                    <div className="bg-slate-900 rounded-xl p-4 shadow-lg text-white shrink-0">
                        {/* Waveform Container */}
                        <div className="mb-4 h-32 bg-slate-800/50 rounded-lg relative overflow-hidden" id="waveform-container">
                            {!audioUrl && <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">No Audio Loaded</div>}
                            {audioUrl && (
                                <WavesurferPlayer
                                    key={audioUrl}
                                    height={128}
                                    waveColor="#4f46e5"
                                    progressColor="#818cf8"
                                    url={audioUrl}
                                    onReady={onReady}
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                    plugins={wavesurferPlugins}
                                />
                            )}
                        </div>

                        {/* Duration Display */}
                        {isPlayerReady && (
                            <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono">
                                <span>{formatMs(currentTime * 1000)}</span>
                                <span>{formatMs(audioDuration * 1000)}</span>
                            </div>
                        )}

                        {/* Controls */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={() => wavesurferRef.current?.skip(-5)}
                                    disabled={!isPlayerReady}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                                >
                                    <SkipBack size={20} />
                                </button>
                                <button
                                    onClick={async () => {
                                        const ws = wavesurferRef.current;
                                        if (ws) {
                                            console.log("Play clicked! Current state:", {
                                                isPlaying: ws.isPlaying(),
                                                duration: ws.getDuration(),
                                                currentTime: ws.getCurrentTime(),
                                            });

                                            try {
                                                // Try explicit play instead of toggle
                                                if (ws.isPlaying()) {
                                                    ws.pause();
                                                } else {
                                                    await ws.play();
                                                }
                                                console.log("After play/pause, isPlaying:", ws.isPlaying());
                                            } catch (err) {
                                                console.error("Play error:", err);
                                            }
                                        } else {
                                            console.error("No wavesurfer ref!");
                                        }
                                    }}
                                    disabled={!isPlayerReady}
                                    className={`p-3 rounded-full shadow-lg transform active:scale-95 transition-all ${isPlayerReady ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-600 cursor-not-allowed'}`}
                                >
                                    {isPlaying ? <Pause fill="white" size={24} /> : <Play fill="white" size={24} className="ml-1" />}
                                </button>
                                <button
                                    onClick={() => wavesurferRef.current?.skip(5)}
                                    disabled={!isPlayerReady}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                                >
                                    <FastForward size={20} />
                                </button>
                            </div>

                            {/* Speed Control */}
                            <div className="flex items-center justify-between bg-white/5 rounded-lg p-2 text-xs">
                                <span className="text-slate-400 font-bold uppercase tracking-wider">Speed</span>
                                <div className="flex gap-1">
                                    {[0.5, 0.75, 1, 1.25, 1.5, 2.0].map(rate => (
                                        <button
                                            key={rate}
                                            onClick={() => handleSpeedChange(rate)}
                                            className={`px-2 py-1 rounded ${playbackRate === rate ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-slate-400'}`}
                                        >
                                            {rate}x
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Queue Panel */}
                    {queue.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-xl flex flex-col min-h-[200px] shadow-sm overflow-hidden mb-4">
                            <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                    <List size={16} className="text-purple-500" /> Queue ({queue.length})
                                </h3>
                                <button onClick={() => setQueue([])} disabled={isBatchProcessing} className="text-xs text-red-500 hover:text-red-700">Clear</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {queue.map((item, idx) => (
                                    <div key={item.id}
                                        onClick={() => {
                                            if (item.status === 'completed' || item.status === 'pending') {
                                                setAudioUrl(URL.createObjectURL(item.file));
                                                setSelectedFile(item.file);
                                                if (item.result) {
                                                    setData(item.result.data);
                                                    setCurrentJobId(item.result.jobId);
                                                }
                                            }
                                        }}
                                        className={`p-2 rounded-lg border text-sm flex justify-between items-center cursor-pointer 
                                            ${selectedFile === item.file ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-slate-50'}
                                            ${item.status === 'processing' ? 'border-blue-200 bg-blue-50 animate-pulse' : 'border-slate-100'}
                                        `}>
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-xs font-mono text-slate-400">#{idx + 1}</span>
                                            <span className="truncate max-w-[150px] font-medium text-slate-700">{item.file.name}</span>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded capitalize 
                                            ${item.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                item.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                                    item.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {item.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* History Panel */}
                    <div className="bg-white border border-slate-200 rounded-xl flex-1 flex flex-col min-h-0 shadow-sm overflow-hidden">
                        <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                <History size={16} className="text-blue-500" /> Job History
                            </h3>
                            <div className="flex items-center gap-2">
                                <button onClick={fetchHistory} className="text-slate-400 hover:text-blue-500 transition-colors" title="Refresh">
                                    <UploadCloud size={14} className="rotate-180" /> {/* Reusing icon as refresh look-alike or use standard refresh icon if available */}
                                </button>
                                <span className="text-xs text-slate-400">{history.length} jobs</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {history.length === 0 ? (
                                <p className="text-center text-slate-400 text-xs py-8">No saved jobs yet.</p>
                            ) : (
                                history.map(job => (
                                    <div key={job.id} className="p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all cursor-pointer group">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium text-slate-700 text-sm truncate max-w-[180px]" title={job.originalName}>{job.originalName}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${job.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {job.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                                            <span>{new Date(job.timestamp).toLocaleDateString()}</span>
                                            <a href={`/api/history/${job.id}/download`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-blue-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                                                Download ZIP
                                            </a>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>

                {/* Right: Data Grid */}
                <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-0 overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <h3 className="text-sm font-bold text-slate-700">Transcription Segments</h3>
                        <div className="flex gap-2">
                            <button onClick={handleAddSegment} className="flex items-center gap-1 text-xs bg-white border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg font-medium text-slate-700">
                                <Plus size={14} /> Add Manual Segment
                            </button>
                        </div>
                    </div>

                    {/* Table Header */}
                    <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <div className="col-span-1">ID</div>
                        <div className="col-span-3">Time Range (HH:MM:SS.mmm)</div>
                        <div className="col-span-2">Speaker</div>
                        <div className="col-span-3">Content</div>
                        <div className="col-span-1">Tag</div>
                        <div className="col-span-1">Type</div>
                        <div className="col-span-1 text-right">Actions</div>
                    </div>

                    {/* Table Body */}
                    <div className="flex-1 overflow-y-auto">
                        {data.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <List size={32} className="opacity-20 mb-2" />
                                <p className="text-sm">No segments data loaded.</p>
                            </div>
                        ) : (
                            data.map((row) => (
                                <div key={row.id}
                                    className={`grid grid-cols-12 p-3 border-b border-slate-100 text-sm hover:bg-blue-50 transition-colors items-center group
                                        ${editingId === row.id ? 'bg-blue-50/50 ring-1 ring-inset ring-blue-200' : ''}`}
                                    onClick={() => {
                                        // Seek on click
                                        if (wavesurferRef.current) wavesurferRef.current.setTime(row.start / 1000);
                                    }}
                                >
                                    {editingId === row.id ? (
                                        // Edit Mode
                                        <>
                                            <div className="col-span-1 text-slate-400 font-mono text-xs">#{row.id}</div>
                                            <div className="col-span-3 flex gap-1 items-center">
                                                <input type="text" className="w-24 text-[10px] p-1 border rounded font-mono"
                                                    value={formatMs(editFormData.start || 0)}
                                                    onChange={e => handleFormChange('start', parseTimeToMs(e.target.value))} />
                                                <span className="text-slate-400">-</span>
                                                <input type="text" className="w-24 text-[10px] p-1 border rounded font-mono"
                                                    value={formatMs(editFormData.end || 0)}
                                                    onChange={e => handleFormChange('end', parseTimeToMs(e.target.value))} />
                                            </div>
                                            <div className="col-span-2">
                                                <input type="text" className="w-full text-xs p-1 border rounded"
                                                    value={editFormData.speaker} onChange={e => handleFormChange('speaker', e.target.value)} />
                                            </div>
                                            <div className="col-span-3">
                                                <input type="text" className="w-full text-xs p-1 border rounded font-medium"
                                                    value={editFormData.word} onChange={e => handleFormChange('word', e.target.value)} />
                                            </div>
                                            <div className="col-span-1">
                                                <input type="text" className="w-full text-[10px] p-1 border rounded" placeholder="Tag"
                                                    value={editFormData.tags || ""} onChange={e => handleFormChange('tags', e.target.value)} />
                                            </div>
                                            <div className="col-span-1">
                                                <select className="w-full text-[10px] p-1 border rounded"
                                                    value={editFormData.type} onChange={e => handleFormChange('type', e.target.value)}>
                                                    <option value="lexical">Lex</option>
                                                    <option value="filler">Fil</option>
                                                    <option value="event">Evt</option>
                                                </select>
                                            </div>
                                            <div className="col-span-1 flex justify-end gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); handleSaveClick(); }} className="p-1 text-green-600 hover:bg-green-100 rounded"><Save size={14} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={14} /></button>
                                            </div>
                                        </>
                                    ) : (
                                        // View Mode
                                        <>
                                            <div className="col-span-1 text-slate-400 font-mono text-xs">#{row.id}</div>
                                            <div className="col-span-3 font-mono text-[10px] text-slate-500">
                                                {formatMs(row.start)} - {formatMs(row.end)}
                                            </div>
                                            <div className="col-span-2 text-xs font-medium text-slate-700 truncate pr-2">
                                                {row.speaker}
                                            </div>
                                            <div className={`col-span-3 font-medium truncate pr-2 ${row.type === 'filler' ? 'text-amber-600 italic' : ''}`}>
                                                {row.word}
                                            </div>
                                            <div className="col-span-1">
                                                <span className="text-[10px] text-slate-400 bg-slate-50 px-1 rounded truncate block max-w-full" title={row.tags}>
                                                    {row.tags || "—"}
                                                </span>
                                            </div>
                                            <div className="col-span-1">
                                                <Badge type={row.type} />
                                            </div>
                                            <div className="col-span-1 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); setEditingId(row.id); setEditFormData({ ...row }); }} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(row.id); }} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

        </div>
    );
}

