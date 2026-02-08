"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const HASHES = [
    '75f89c9ab4558a67ef7a927168f48758feae2f466e5fef6bb260491edc904da2', // VYX-2026-TRIAL-9901
    '9f335436693ef39859f2a71d0879ddcca55bb37e882e97330b00f179b9949bf9'  // VYX-2026-JUDGE-7702
];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const checkAuth = () => {
            const session = localStorage.getItem('vyonix_session');
            const authTime = localStorage.getItem('vyonix_auth_time');

            // Session expires after 24 hours
            const isExpired = authTime && (Date.now() - parseInt(authTime) > 86400000);

            if (!session || !HASHES.includes(session) || isExpired) {
                localStorage.removeItem('vyonix_session');
                localStorage.removeItem('vyonix_auth_time');
                // Use a proper landing page URL or just redirect back
                window.location.href = '/landing-page/modern-landing.html';
                return;
            }
            setAuthorized(true);
        };

        checkAuth();
    }, [pathname, router]);

    if (!authorized) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl animate-spin flex items-center justify-center text-xl">
                        🌌
                    </div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Verifying Authorization...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
