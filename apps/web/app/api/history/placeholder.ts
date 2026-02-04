import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { JobStorage } from "@/lib/storage";

// Helper to look up file path by ID
async function findZipPath(id: string): Promise<string | null> {
    const history = await JobStorage.getHistory();
    const entry = history.find((h: any) => h.id === id);
    if (!entry) return null;

    // Reconstruct connection logic or store zip path in metadata (easier to reconstruct)
    // Structure: data/jobs/[name]_[id]/[name].zip
    const safeName = entry.originalName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, "");
    const zipPath = path.join(process.cwd(), '..', '..', 'data', 'jobs', `${safeName}_${entry.id}`, `${safeName}.zip`);

    if (fs.existsSync(zipPath)) return zipPath;
    return null;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Note: In App Router, dynamic routes params are handled differently but for generic route.ts we can use search params or dynamic segments
    // Since we created this as `app/api/history/[id]/download/route.ts`... wait, I haven't created the folder yet. 
    // Let's assume we use searchParams for simplicity in a single route file or create the dynamic folder structure.
    // Let's stick to creating the dynamic folder structure for clean API design: /api/history/[id]/download
    return NextResponse.json({ error: "Method not allowed. Use dynamic route." }, { status: 405 });
}
