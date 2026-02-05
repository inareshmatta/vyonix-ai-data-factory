// System Sync: 2026-02-05
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Mic,
    Image as ImageIcon,
    FileText,
    LayoutDashboard,
    Layers,
    Settings,
    DollarSign
} from 'lucide-react';

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    href: string;
    active: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, href, active }) => (
    <Link
        href={href}
        className={`w-full flex items-center space-x-3 px-6 py-3 transition-colors duration-200 ${active
            ? 'bg-blue-50 border-r-4 border-blue-600 text-blue-700'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
    >
        <Icon size={20} />
        <span className="font-medium text-sm">{label}</span>
    </Link>
);

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-screen">
            <div className="h-16 flex items-center px-6 border-b border-slate-100 flex-shrink-0">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-lg mr-3 shadow-lg shadow-indigo-500/20">
                    🌌
                </div>
                <span className="font-bold text-lg tracking-tight text-slate-800">Vyonix AI <span className="text-blue-600">Data Factory</span></span>
            </div>

            <div className="flex-1 py-6 space-y-1 overflow-y-auto">
                <SidebarItem
                    icon={LayoutDashboard}
                    label="Dashboard"
                    href="/"
                    active={pathname === '/'}
                />

                <div className="px-6 pt-6 pb-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Studios</p>
                </div>

                <SidebarItem
                    icon={Mic}
                    label="Audio Studio"
                    href="/audio"
                    active={pathname === '/audio'}
                />
                <SidebarItem
                    icon={ImageIcon}
                    label="Vision Studio"
                    href="/image"
                    active={pathname === '/image'}
                />
                <SidebarItem
                    icon={FileText}
                    label="NLP Studio"
                    href="/text"
                    active={pathname === '/text'}
                />

                <div className="px-6 pt-6 pb-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operations</p>
                </div>

                <SidebarItem
                    icon={DollarSign}
                    label="Cost Estimator"
                    href="/cost"
                    active={pathname === '/cost'}
                />
                <SidebarItem
                    icon={Settings}
                    label="Configuration"
                    href="/settings"
                    active={pathname === '/settings'}
                />
            </div>

            <div className="p-4 border-t border-slate-100 flex-shrink-0">
                <div className="flex items-center space-x-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">NM</div>
                    <div>
                        <p className="text-xs font-medium text-slate-700">Naresh Matta</p>
                        <p className="text-[10px] text-slate-400">ADF - AI Data Factory</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
