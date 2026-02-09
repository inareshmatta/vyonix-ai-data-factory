// System Sync: 2026-02-05
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Mic,
    Image as ImageIcon,
    Video,
    FileText,
    LayoutDashboard,
    Settings,
    DollarSign,
    ChevronLeft,
    ChevronRight,
    PanelLeftClose,
    PanelLeftOpen
} from 'lucide-react';

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    href: string;
    active: boolean;
    collapsed: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, href, active, collapsed }) => (
    <Link
        href={href}
        className={`flex items-center ${collapsed ? 'justify-center px-2' : 'px-6 space-x-3'} py-3 transition-all duration-200 group relative ${active
            ? 'bg-blue-50 border-r-4 border-blue-600 text-blue-700'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
        title={collapsed ? label : undefined}
    >
        <Icon size={20} className={`flex-shrink-0 ${active ? 'text-blue-600' : ''}`} />
        {!collapsed && <span className="font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-300">{label}</span>}

        {/* Tooltip for collapsed state */}
        {collapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                {label}
            </div>
        )}
    </Link>
);

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close mobile menu when path changes
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    if (!mounted) return null;

    return (
        <>
            {/* Mobile Toggle Button (Fixed to top-left, visible only on mobile) */}
            <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden fixed top-3 left-3 z-[60] p-2 bg-white rounded-lg shadow-md text-slate-600 hover:text-blue-600 border border-slate-200"
                aria-label="Open Menu"
            >
                <PanelLeftOpen size={20} />
            </button>

            {/* Mobile Backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[65] md:hidden animate-in fade-in duration-200"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div
                className={`
                    bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-screen transition-all duration-300 ease-in-out
                    fixed inset-y-0 left-0 z-[70] md:relative md:translate-x-0
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
                    ${collapsed ? 'md:w-20' : 'md:w-64'}
                    w-64 
                `}
            >
                {/* Collapse Toggle (Desktop Only) */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden md:flex absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1 shadow-md text-slate-400 hover:text-blue-600 transition-colors z-50 hover:scale-110"
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                {/* Mobile Close Button */}
                <button
                    onClick={() => setMobileOpen(false)}
                    className="md:hidden absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                >
                    <PanelLeftClose size={24} />
                </button>

                <div className={`h-16 flex items-center ${collapsed ? 'md:justify-center md:px-2' : 'px-6'} border-b border-slate-100 flex-shrink-0 transition-all duration-300`}>
                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-lg shadow-lg shadow-indigo-500/20 flex-shrink-0">
                        🌌
                    </div>
                    {(!collapsed || mobileOpen) && (
                        <span className={`font-bold text-lg tracking-tight text-slate-800 ml-3 whitespace-nowrap overflow-hidden ${collapsed ? 'md:hidden' : ''}`}>
                            Vyonix <span className="text-blue-600">ADF</span>
                        </span>
                    )}
                </div>

                <div className="flex-1 py-6 space-y-1 overflow-y-auto overflow-x-hidden">
                    <SidebarItem
                        icon={LayoutDashboard}
                        label="Dashboard"
                        href="/"
                        active={pathname === '/'}
                        collapsed={collapsed && !mobileOpen} // Force expanded on mobile
                    />

                    {(!collapsed || mobileOpen) && (
                        <div className={`px-6 pt-6 pb-2 ${collapsed ? 'md:hidden' : ''}`}>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Studios</p>
                        </div>
                    )}
                    {(collapsed && !mobileOpen) && <div className="hidden md:block h-4"></div>}

                    <SidebarItem
                        icon={Mic}
                        label="Audio Studio"
                        href="/audio"
                        active={pathname === '/audio'}
                        collapsed={collapsed && !mobileOpen}
                    />
                    <SidebarItem
                        icon={ImageIcon}
                        label="Vision Studio"
                        href="/vision"
                        active={pathname?.startsWith('/vision') || pathname === '/image' || pathname === '/video'}
                        collapsed={collapsed && !mobileOpen}
                    />
                    <SidebarItem
                        icon={FileText}
                        label="NLP Studio"
                        href="/text"
                        active={pathname === '/text'}
                        collapsed={collapsed && !mobileOpen}
                    />

                    {(!collapsed || mobileOpen) && (
                        <div className={`px-6 pt-6 pb-2 ${collapsed ? 'md:hidden' : ''}`}>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operations</p>
                        </div>
                    )}
                    {(collapsed && !mobileOpen) && <div className="hidden md:block h-4"></div>}

                    <SidebarItem
                        icon={DollarSign}
                        label="Cost Estimator"
                        href="/cost"
                        active={pathname === '/cost'}
                        collapsed={collapsed && !mobileOpen}
                    />
                    <SidebarItem
                        icon={Settings}
                        label="Configuration"
                        href="/settings"
                        active={pathname === '/settings'}
                        collapsed={collapsed && !mobileOpen}
                    />
                </div>

                <div className="p-4 border-t border-slate-100 flex-shrink-0">
                    <div className={`flex items-center ${collapsed ? 'md:justify-center' : 'space-x-3'} p-2 rounded-lg bg-slate-50 border border-slate-100 transition-all`}>
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs flex-shrink-0">NM</div>
                        {(!collapsed || mobileOpen) && (
                            <div className={`overflow-hidden ${collapsed ? 'md:hidden' : ''}`}>
                                <p className="text-xs font-medium text-slate-700 truncate">Naresh Matta</p>
                                <p className="text-[10px] text-slate-400 truncate">AI Data Factory</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
