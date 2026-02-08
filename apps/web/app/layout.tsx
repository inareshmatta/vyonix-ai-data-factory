import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { Search, Settings } from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import { StudioStateProvider } from "@/contexts/StudioStateContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vyonix AI Data Factory",
  description: "Enterprise AI Data Annotation Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 font-sans text-slate-900`}>
        <AuthGuard>
          <StudioStateProvider>
            <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
              <Sidebar />

              {/* Main Content */}
              <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-0 flex-shrink-0">
                  <div className="flex items-center text-slate-400 text-sm">
                    <Search size={16} className="mr-2" />
                    <span>Search jobs, datasets, or files...</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100 flex items-center">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse"></div>
                      System Healthy
                    </div>
                    <Settings size={18} className="text-slate-400 hover:text-slate-600 cursor-pointer" />
                  </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
                  <div className="max-w-7xl mx-auto h-full">
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </StudioStateProvider>
        </AuthGuard>
      </body>
    </html>
  );
}
