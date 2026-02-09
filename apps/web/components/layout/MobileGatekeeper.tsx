"use client";

import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, ArrowRight, X } from 'lucide-react';

export default function MobileGatekeeper({ children }: { children: React.ReactNode }) {
    const [isMobile, setIsMobile] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Check session storage to see if user already dismissed the warning
        const dismissed = sessionStorage.getItem('vyonix-mobile-warning-dismissed');
        if (dismissed === 'true') {
            setIsDismissed(true);
        }

        const checkMobile = () => {
            // Check if width is less than 480px (Strictly mobile phones)
            // Lowered from 640px to prevent accidental trigger on small desktop windows
            setIsMobile(window.innerWidth < 480);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleDismiss = () => {
        setIsDismissed(true);
        sessionStorage.setItem('vyonix-mobile-warning-dismissed', 'true');
    };

    if (!mounted) return null; // Avoid hydration mismatch

    // If mobile and NOT dismissed, show the warning gatekeeper
    if (isMobile && !isDismissed) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                <div className="relative mb-8 transform hover:scale-105 transition-transform duration-500">
                    <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
                    <div className="relative bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-2xl">
                        <Monitor size={48} className="text-blue-400 mb-4 mx-auto" />
                        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-medium">
                            <span className="line-through decoration-red-500">Mobile</span>
                            <ArrowRight size={14} />
                            <span className="text-emerald-400 font-bold">Desktop</span>
                        </div>
                    </div>
                </div>

                <h1 className="text-3xl font-black tracking-tight mb-4">
                    Desktop Recommended
                </h1>

                <p className="text-slate-400 max-w-xs mx-auto leading-relaxed mb-8 text-sm">
                    Vyonix Studio is optimized for large screens. For the best experience with our AI forensic tools, please switch to a desktop or tablet.
                </p>

                <div className="space-y-4 w-full max-w-xs">
                    {/* Primary Action - "I understand" (hidden semantics, really just a visual anchor) */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 backdrop-blur-sm mb-6">
                        <div className="flex items-center gap-3 text-left">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Monitor size={20} className="text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Best Experience</p>
                                <p className="text-sm font-medium text-slate-500">1024px+ Display</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-2 group"
                    >
                        <span>Continue to Mobile Site</span>
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
