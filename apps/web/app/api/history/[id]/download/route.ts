import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { JobStorage } from "@/lib/storage";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    try {
        const history = await JobStorage.getHistory();
        const entry = history.find((h: any) => h.id === id);

        if (!entry) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        const safeName = entry.originalName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, "");
        const zipPath = path.join(process.cwd(), '..', '..', 'data', 'jobs', `${safeName}_${entry.id}`, `${safeName}.zip`);

        if (!fs.existsSync(zipPath)) {
            return NextResponse.json({ error: "File not found on server" }, { status: 404 });
        }

        const fileBuffer = await fs.promises.readFile(zipPath);

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${safeName}.zip"`
            }
        });

    } catch (error) {
        console.error("Download error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
