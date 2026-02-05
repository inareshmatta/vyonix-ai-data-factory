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
    X
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
            project: "Vyonix Studio",
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

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-20 shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🌌</span>
                    <h1 className="font-bold text-slate-800">Vyonix <span className="text-blue-600">Studio</span> <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded ml-2 font-mono">VISION PRO</span></h1>
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
                        <Download size={16} /> Export JSON
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

                        {!imageSrc && (
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
