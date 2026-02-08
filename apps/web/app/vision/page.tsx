"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, Video, ArrowRight } from 'lucide-react';

export default function VisionHub() {
    const router = useRouter();

    return (
        <div className="h-full bg-slate-50 p-8 flex flex-col items-center justify-center">
            <div className="max-w-4xl w-full text-center mb-12">
                <h1 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">Vision Intelligence Hub</h1>
                <p className="text-slate-500 text-lg">Select an annotation modality to begin your data workflow.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
                {/* Image Annotation Card */}
                <div
                    onClick={() => router.push('/image')}
                    className="group bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150" />
                    <div className="relative z-10 flex flex-col h-full items-center text-center">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform">
                            <ImageIcon size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-3">Image Annotation</h2>
                        <p className="text-slate-500 mb-8">Zero-shot object detection, segmentation, and classification using Gemini Pro Vision.</p>
                        <div className="mt-auto flex items-center gap-2 text-emerald-600 font-bold text-sm uppercase tracking-widest">
                            Launch Studio <ArrowRight size={16} />
                        </div>
                    </div>
                </div>

                {/* Video Annotation Card */}
                <div
                    onClick={() => router.push('/video')}
                    className="group bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150" />
                    <div className="relative z-10 flex flex-col h-full items-center text-center">
                        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:-rotate-12 transition-transform">
                            <Video size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-3">Video Annotation</h2>
                        <p className="text-slate-500 mb-8">Frame-accurate object detection and scene transcription powered by <strong>Gemini 3 Flash</strong>.</p>
                        <div className="mt-auto flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-widest">
                            Launch Studio <ArrowRight size={16} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
