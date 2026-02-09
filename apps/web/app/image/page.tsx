// System Sync: 2026-02-05
"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
    Image as ImageIcon,
    UploadCloud,
    Download,
    Square,
    Hand,
    MousePointer,
    Maximize,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    Trash2,
    X,
    Sparkles,
    Loader2,
    Check,
    ScanEye,
    Package
} from 'lucide-react';
import { trackUsage } from '@/lib/usage';

interface BoundingBox {
    id: number;
    label: string;
    conf: number;
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
}

interface Viewport {
    x: number;
    y: number;
    scale: number;
}

export default function ImageStudio() {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [boxes, setBoxes] = useState<BoundingBox[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [tool, setTool] = useState<'select' | 'draw' | 'pan'>('select');
    const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
    const [currentDraw, setCurrentDraw] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
    const [resizeHandle, setResizeHandle] = useState<string | null>(null);

    // Generator State
    const [showGenerator, setShowGenerator] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [genOptions, setGenOptions] = useState({
        object: '',
        location: '',
        background: '',
        count: 1
    });
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);

    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // --- Helpers ---
    const updateDims = () => {
        if (imgRef.current) {
            setImgDims({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight });
        }
    };

    useEffect(() => {
        window.addEventListener('resize', updateDims);
        return () => window.removeEventListener('resize', updateDims);
    }, []);

    const handleImageLoad = () => {
        updateDims();
        // Initial fit
        if (imgRef.current && containerRef.current) {
            const cw = containerRef.current.clientWidth;
            const ch = containerRef.current.clientHeight;
            const iw = imgRef.current.naturalWidth;
            const ih = imgRef.current.naturalHeight;
            const scale = Math.min((cw - 80) / iw, (ch - 80) / ih, 1);
            setViewport({
                x: (cw - iw * scale) / 2,
                y: (ch - ih * scale) / 2,
                scale
            });
        }
    };

    const getMousePos = (e: React.MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return {
            x: (e.clientX - rect.left - viewport.x) / viewport.scale,
            y: (e.clientY - rect.top - viewport.y) / viewport.scale
        };
    };

    const toNorm = (x: number, y: number) => ({
        x: (x / imgDims.w) * 1000,
        y: (y / imgDims.h) * 1000
    });

    // --- Handlers ---
    const onMouseDown = (e: React.MouseEvent) => {
        const { x, y } = getMousePos(e);
        if (tool === 'pan' || (e.button === 1)) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
        } else if (tool === 'draw') {
            setIsDragging(true);
            setDragStart({ x, y });
            setCurrentDraw({ x, y, w: 0, h: 0 });
        } else if (tool === 'select' && resizeHandle) {
            setIsDragging(true);
        } else if (tool === 'select') {
            setSelectedId(null);
        }
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;

        if (tool === 'pan' || (dragStart && !currentDraw && !resizeHandle)) {
            setViewport(prev => ({
                ...prev,
                x: e.clientX - (dragStart?.x || 0),
                y: e.clientY - (dragStart?.y || 0)
            }));
        } else if (tool === 'draw' && dragStart) {
            const { x, y } = getMousePos(e);
            setCurrentDraw({
                x: Math.min(x, dragStart.x),
                y: Math.min(y, dragStart.y),
                w: Math.abs(x - dragStart.x),
                h: Math.abs(y - dragStart.y)
            });
        } else if (tool === 'select' && resizeHandle && selectedId !== null) {
            const { x, y } = getMousePos(e);
            setBoxes(prev => prev.map(box => {
                if (box.id !== selectedId) return box;
                let x1 = (box.xmin / 1000) * imgDims.w;
                let y1 = (box.ymin / 1000) * imgDims.h;
                let x2 = (box.xmax / 1000) * imgDims.w;
                let y2 = (box.ymax / 1000) * imgDims.h;

                switch (resizeHandle) {
                    case 'nw': x1 = x; y1 = y; break;
                    case 'ne': x2 = x; y1 = y; break;
                    case 'sw': x1 = x; y2 = y; break;
                    case 'se': x2 = x; y2 = y; break;
                }

                const newXmin = Math.min(x1, x2);
                const newXmax = Math.max(x1, x2);
                const newYmin = Math.min(y1, y2);
                const newYmax = Math.max(y1, y2);

                const p1 = toNorm(newXmin, newYmin);
                const p2 = toNorm(newXmax, newYmax);

                return {
                    ...box,
                    xmin: p1.x, ymin: p1.y,
                    xmax: p2.x, ymax: p2.y
                };
            }));
        }
    };

    const onMouseUp = () => {
        if (tool === 'draw' && isDragging && currentDraw) {
            if (currentDraw.w > 5 && currentDraw.h > 5) {
                const p1 = toNorm(currentDraw.x, currentDraw.y);
                const p2 = toNorm(currentDraw.x + currentDraw.w, currentDraw.y + currentDraw.h);
                const newBox: BoundingBox = {
                    id: Date.now(),
                    label: "Object",
                    conf: 1.0,
                    xmin: p1.x, ymin: p1.y,
                    xmax: p2.x, ymax: p2.y
                };
                setBoxes(prev => [...prev, newBox]);
                setSelectedId(newBox.id);
                setTool('select');
            }
        }
        setIsDragging(false);
        setDragStart(null);
        setCurrentDraw(null);
        setResizeHandle(null);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const ZOOM_SPEED = 0.001;
        const newScale = Math.max(0.1, Math.min(10, viewport.scale - e.deltaY * ZOOM_SPEED));
        setViewport(prev => ({ ...prev, scale: newScale }));
    };

    const handleUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const objectUrl = URL.createObjectURL(file);
            setImageSrc(objectUrl);
            setViewport({ x: 0, y: 0, scale: 1 });
            setBoxes([]);
            setIsProcessing(true);

            const formData = new FormData();
            formData.append("file", file);
            try {
                const response = await fetch('/api/ai/image', { method: 'POST', body: formData });
                const result = await response.json();
                if (response.ok) {
                    const newBoxes = Array.isArray(result) ? result.map((b: any, i: number) => ({
                        ...b, id: Date.now() + i,
                        xmin: b.xmin ?? 0, ymin: b.ymin ?? 0, xmax: b.xmax ?? 1000, ymax: b.ymax ?? 1000
                    })) : [];
                    setBoxes(newBoxes);
                    trackUsage({
                        images_processed: 1,
                        tokens_input: 1000, // Image token cost heuristic
                        tokens_output: newBoxes.length * 50
                    });
                } else { alert(`Error: ${result.error}`); }
            } catch (error) { alert("Upload error"); }
            finally { setIsProcessing(false); }
        };
        input.click();
    };

    const handleExport = () => {
        if (boxes.length === 0) return;
        const exportData = {
            project: "Vyonix AI Data Factory",
            timestamp: new Date().toISOString(),
            imageDimensions: imgDims,
            annotations: boxes.map(b => ({
                label: b.label,
                confidence: b.conf,
                coordinates: { xmin: b.xmin, ymin: b.ymin, xmax: b.xmax, ymax: b.ymax },
                normalized: true
            }))
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `vyonix_annotation_${Date.now()}.json`;
        a.click();
    };

    const handleGenerate = async () => {
        if (!genOptions.object) return;
        setIsGenerating(true);
        setGeneratedImages([]);

        try {
            const response = await fetch('/api/ai/image/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(genOptions)
            });
            const result = await response.json();
            if (response.ok && result.images) {
                setGeneratedImages(result.images);
                trackUsage({
                    images_generated: genOptions.count,
                    tokens_input: 500,
                    tokens_output: genOptions.count * 1000
                });
            } else {
                alert(`Generation failed: ${result.error}`);
            }
        } catch (e) {
            alert("Generation error");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAutoAnnotate = async () => {
        if (!imageSrc) return;
        setIsProcessing(true);
        try {
            // Helper to get base64
            let startImage = imageSrc;
            if (!imageSrc.startsWith('data:')) {
                // If it's a URL (blob or relative), fetch it
                const r = await fetch(imageSrc);
                const b = await r.blob();
                startImage = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(b);
                });
            }

            const response = await fetch('/api/ai/image/annotate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: startImage,
                    prompt: "Detect all relevant objects"
                })
            });
            const result = await response.json();
            if (response.ok && result.annotations) {
                const newBoxes = result.annotations.map((b: any, i: number) => ({
                    id: Date.now() + i,
                    label: b.label || "Object",
                    conf: b.confidence || b.conf || 0.9,
                    xmin: b.xmin || 0,
                    ymin: b.ymin || 0,
                    xmax: b.xmax || 1000,
                    ymax: b.ymax || 1000,
                }));
                setBoxes(prev => [...prev, ...newBoxes]);
            } else {
                alert("Annotation Failed: " + (result.error || "Unknown"));
            }

        } catch (e) {
            console.error(e);
            alert("Annotation Error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleZipExport = async () => {
        if (!imageSrc || boxes.length === 0) return;

        let finalImage = imageSrc;
        // Convert to base64 if needed
        if (!imageSrc.startsWith('data:')) {
            const r = await fetch(imageSrc);
            const b = await r.blob();
            finalImage = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(b);
            });
        }

        try {
            const response = await fetch('/api/ai/image/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: finalImage,
                    annotations: boxes,
                    project: "Vyonix Vision Project"
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `vyonix_dataset_${Date.now()}.zip`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                alert("Export Failed");
            }
        } catch (e) {
            alert("Export Error");
        }
    };



    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-20 shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🌌</span>
                    <h1 className="font-bold text-slate-800 shrink-0">Vyonix AI <span className="text-blue-600">Data Factory</span> <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded ml-2 font-mono">VISION PRO</span></h1>
                </div>

                {/* Center Button Area */}
                <div className="flex-1 flex justify-center">
                    <button
                        onClick={() => setShowGenerator(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-6 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 group"
                    >
                        <Sparkles size={16} className="group-hover:animate-pulse" />
                        Generate Image
                    </button>
                </div>

                <div className="flex gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-4">
                        <button onClick={() => setTool('select')} className={`flex items-center gap-1.5 px-2 py-1.5 rounded ${tool === 'select' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Select (V)">
                            <MousePointer size={16} />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Select</span>
                        </button>
                        <button onClick={() => setTool('pan')} className={`flex items-center gap-1.5 px-2 py-1.5 rounded ${tool === 'pan' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Pan (H)">
                            <Hand size={16} />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Pan</span>
                        </button>
                        <button onClick={() => setTool('draw')} className={`flex items-center gap-1.5 px-2 py-1.5 rounded ${tool === 'draw' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Draw Box (B)">
                            <Square size={16} />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Box</span>
                        </button>
                    </div>

                    <button onClick={handleUpload} disabled={isProcessing} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-all">
                        {isProcessing ? <span className="animate-spin">⏳</span> : <UploadCloud size={16} />}
                        {isProcessing ? 'Analyzing...' : 'Upload'}
                    </button>
                    <button onClick={handleExport} disabled={boxes.length === 0} className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm disabled:opacity-50">
                        <Download size={16} /> JSON
                    </button>
                    <button onClick={handleZipExport} disabled={boxes.length === 0} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm disabled:opacity-50">
                        <Package size={16} /> ZIP
                    </button>
                    <button onClick={handleAutoAnnotate} disabled={!imageSrc || isProcessing} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm disabled:opacity-50">
                        <ScanEye size={16} /> Auto-Annotate
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Canvas Area */}
                <div className="flex-1 bg-[#1a1a1a] relative overflow-hidden flex items-center justify-center cursor-crosshair">
                    <div
                        ref={containerRef}
                        className="absolute inset-0 overflow-hidden"
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseUp}
                        onWheel={handleWheel}
                        style={{ cursor: tool === 'pan' || (tool === 'select' && isDragging && !resizeHandle) === true ? 'grab' : tool === 'draw' ? 'crosshair' : 'default' }}
                    >
                        {imageSrc && (
                            <div
                                style={{
                                    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
                                    transformOrigin: '0 0',
                                    width: imgDims.w || 1,
                                    height: imgDims.h || 1,
                                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                                }}
                                className="relative shadow-2xl"
                            >
                                <img
                                    ref={imgRef}
                                    src={imageSrc}
                                    alt="Target"
                                    onLoad={handleImageLoad}
                                    className="pointer-events-none select-none"
                                    style={{ maxWidth: 'none' }}
                                />

                                <svg className="absolute inset-0 w-full h-full" style={{ width: imgDims.w, height: imgDims.h }}>
                                    {boxes.map(box => {
                                        const isSel = box.id === selectedId;
                                        const x = (box.xmin / 1000) * imgDims.w;
                                        const y = (box.ymin / 1000) * imgDims.h;
                                        const w = ((box.xmax - box.xmin) / 1000) * imgDims.w;
                                        const h = ((box.ymax - box.ymin) / 1000) * imgDims.h;

                                        return (
                                            <g key={box.id}>
                                                <rect
                                                    x={x} y={y} width={w} height={h}
                                                    fill={isSel ? "rgba(59, 130, 246, 0.2)" : "rgba(16, 185, 129, 0.1)"}
                                                    stroke={isSel ? "#3b82f6" : "#10b981"}
                                                    strokeWidth={2 / viewport.scale}
                                                    onMouseDown={(e) => {
                                                        if (tool === 'select') {
                                                            e.stopPropagation();
                                                            setSelectedId(box.id);
                                                        }
                                                    }}
                                                    className="cursor-pointer hover:fill-opacity-30"
                                                />
                                                <g transform={`translate(${x}, ${y})`}>
                                                    <rect
                                                        x={0} y={-14 / viewport.scale}
                                                        width={(box.label.length * 7 + 10) / viewport.scale}
                                                        height={14 / viewport.scale}
                                                        fill={isSel ? "#3b82f6" : "#10b981"}
                                                        rx={2 / viewport.scale}
                                                    />
                                                    <text
                                                        x={5 / viewport.scale} y={-4 / viewport.scale}
                                                        fill="white" fontSize={10 / viewport.scale} fontWeight="bold"
                                                        className="select-none pointer-events-none"
                                                    >
                                                        {box.label}
                                                    </text>
                                                </g>
                                                {isSel && (
                                                    <>
                                                        {[
                                                            { pos: 'nw', cx: x, cy: y },
                                                            { pos: 'ne', cx: x + w, cy: y },
                                                            { pos: 'sw', cx: x, cy: y + h },
                                                            { pos: 'se', cx: x + w, cy: y + h }
                                                        ].map(hdl => (
                                                            <rect
                                                                key={hdl.pos}
                                                                x={hdl.cx - 4 / viewport.scale}
                                                                y={hdl.cy - 4 / viewport.scale}
                                                                width={8 / viewport.scale}
                                                                height={8 / viewport.scale}
                                                                fill="white"
                                                                stroke="#2563eb"
                                                                strokeWidth={1 / viewport.scale}
                                                                className={`cursor-${hdl.pos}-resize pointer-events-auto`}
                                                                onMouseDown={(e) => {
                                                                    e.stopPropagation();
                                                                    setIsDragging(true);
                                                                    setResizeHandle(hdl.pos);
                                                                }}
                                                            />
                                                        ))}
                                                    </>
                                                )}
                                            </g>
                                        );
                                    })}
                                    {currentDraw && (
                                        <rect
                                            x={currentDraw.x} y={currentDraw.y}
                                            width={currentDraw.w} height={currentDraw.h}
                                            fill="rgba(59, 130, 246, 0.1)"
                                            stroke="#3b82f6"
                                            strokeWidth={1 / viewport.scale}
                                            strokeDasharray="4"
                                        />
                                    )}
                                </svg>
                            </div>
                        )}

                        {!imageSrc && !showGenerator && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-neutral-500 flex flex-col items-center">
                                    <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center mb-4 transition-transform">
                                        <ImageIcon size={32} />
                                    </div>
                                    <p className="text-lg font-black tracking-widest text-neutral-400 uppercase">Upload or Drag Image</p>
                                    <p className="text-xs text-neutral-600 mt-2 font-mono uppercase tracking-tighter">Detection model: Vyonix-I-3</p>
                                </div>
                            </div>
                        )}

                        {/* Generate Slider Overlay */}
                        <div
                            className={`absolute inset-0 bg-white/95 backdrop-blur-md z-30 transition-transform duration-500 ease-in-out flex flex-col ${showGenerator ? 'translate-y-0' : 'translate-y-full'}`}
                        >
                            <div className="h-16 border-b border-slate-100 flex items-center justify-between px-8 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                                        <Sparkles size={18} />
                                    </div>
                                    <h2 className="font-bold text-slate-800">Advanced Image Synthesis</h2>
                                </div>
                                <button
                                    onClick={() => setShowGenerator(false)}
                                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-8 flex gap-12">
                                {/* Form Area */}
                                <div className="w-96 space-y-6">
                                    <div className="space-y-4 animate-in slide-in-from-left duration-700">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Target Object</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Vintage leather armchair"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                                value={genOptions.object}
                                                onChange={e => setGenOptions(prev => ({ ...prev, object: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Location Context</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. In a cozy library corner"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                                value={genOptions.location}
                                                onChange={e => setGenOptions(prev => ({ ...prev, location: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Background Style</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Moody lighting, warm mahogany shelves"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                                value={genOptions.background}
                                                onChange={e => setGenOptions(prev => ({ ...prev, background: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 flex justify-between">
                                                <span>Variation Count</span>
                                                <span className="text-indigo-600">{genOptions.count} images</span>
                                            </label>
                                            <input
                                                type="range" min="1" max="5"
                                                className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
                                                value={genOptions.count}
                                                onChange={e => setGenOptions(prev => ({ ...prev, count: parseInt(e.target.value) }))}
                                            />
                                            <div className="flex justify-between text-[10px] text-slate-300 font-mono mt-1">
                                                <span>1</span><span>5</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleGenerate}
                                        disabled={!genOptions.object || isGenerating}
                                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Synthesizing Data...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={18} />
                                                Generate Synthetic Data
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Results Area */}
                                <div className="flex-1 space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Output Preview</label>
                                    <div className="grid grid-cols-2 gap-4 auto-rows-max">
                                        {generatedImages.length === 0 ? (
                                            <div className="col-span-2 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-300">
                                                <ImageIcon size={48} className="opacity-20 mb-4" />
                                                <p className="text-sm font-medium">Synthetic imagery will appear here</p>
                                            </div>
                                        ) : (
                                            generatedImages.map((url, idx) => (
                                                <div key={idx} className="relative group rounded-2xl overflow-hidden shadow-md animate-in zoom-in duration-500">
                                                    <img src={url} alt={`Gen ${idx}`} className="w-full h-48 object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setImageSrc(url);
                                                                setShowGenerator(false);
                                                                setBoxes([]);
                                                            }}
                                                            className="bg-white text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg"
                                                        >
                                                            <Check size={14} /> Use This
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floating Zoom Controls */}
                    <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-white rounded-lg shadow-lg border border-slate-200 p-1">
                        <button onClick={() => setViewport(v => ({ ...v, scale: v.scale * 1.1 }))} className="p-2 hover:bg-slate-50 text-slate-600 rounded"><ZoomInIcon size={18} /></button>
                        <button onClick={() => setViewport(v => ({ ...v, scale: v.scale * 0.9 }))} className="p-2 hover:bg-slate-50 text-slate-600 rounded"><ZoomOutIcon size={18} /></button>
                        <button onClick={() => handleImageLoad()} className="p-2 hover:bg-slate-50 text-slate-600 rounded" title="Reset"><Maximize size={18} /></button>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-72 bg-white border-l border-slate-200 flex flex-col shadow-xl z-10 shrink-0">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-800 text-sm tracking-tight">Objects</h3>
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono">{boxes.length}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/30">
                        {boxes.map(box => (
                            <div
                                key={box.id}
                                onClick={() => setSelectedId(box.id)}
                                className={`p-3 rounded-xl border text-sm cursor-pointer transition-all ${selectedId === box.id ? 'bg-white border-blue-400 shadow-md ring-1 ring-blue-50' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <input
                                        className="font-bold text-slate-800 bg-transparent border-none p-0 focus:ring-0 w-full text-xs uppercase tracking-tight"
                                        value={box.label}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setBoxes(prev => prev.map(b => b.id === box.id ? { ...b, label: val } : b));
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1 rounded font-mono shrink-0 ml-2">{(box.conf * 100).toFixed(0)}%</span>
                                </div>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
                                    <span className="text-[9px] text-slate-400 font-mono tracking-tighter">ID: #{box.id.toString().slice(-4)}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setBoxes(p => p.filter(b => b.id !== box.id)); }}
                                        className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {selectedId && (
                        <div className="p-4 bg-white border-t border-slate-100 space-y-2">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Context Actions</h4>
                            <div className="grid grid-cols-2 gap-2 text-center">
                                <button className="bg-slate-50 border border-slate-200 text-slate-600 py-2 rounded-lg text-[10px] font-bold hover:bg-slate-100 transition-colors uppercase tracking-tight">Duplicate</button>
                                <button onClick={() => { setBoxes(p => p.filter(b => b.id !== selectedId)); setSelectedId(null); }} className="bg-red-50 border border-red-100 text-red-600 py-2 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-colors uppercase tracking-tight">Remove</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
