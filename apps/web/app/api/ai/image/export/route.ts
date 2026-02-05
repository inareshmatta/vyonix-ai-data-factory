
import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import { Readable } from "stream";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { image, annotations, project } = body;

        if (!image || !annotations) {
            return NextResponse.json({ error: "Missing image or annotations" }, { status: 400 });
        }

        // Create a PassThrough stream (or just work with buffer)
        // Since we need to return a Response with a stream, we can use a helper
        // But Next.js App Router streaming is tricky with archiver updates.
        // Easier: Generate Buffer in memory (images aren't huge-huge) and return it.
        // For 4K images, it might be 10MB. Buffer is fine for this scale.

        const chunks: any[] = [];
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise<NextResponse>((resolve, reject) => {
            archive.on('error', (err: any) => reject(NextResponse.json({ error: err.message }, { status: 500 })));

            archive.on('data', (chunk: any) => chunks.push(chunk));

            archive.on('end', () => {
                const resultBuffer = Buffer.concat(chunks);
                const response = new NextResponse(resultBuffer, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/zip',
                        'Content-Disposition': `attachment; filename="vyonix_dataset_${Date.now()}.zip"`,
                    }
                });
                resolve(response);
            });

            // Add Data
            // 1. JSON
            const jsonContent = JSON.stringify({
                project: project || "Vyonix AI",
                timestamp: new Date().toISOString(),
                annotations: annotations
            }, null, 2);
            archive.append(jsonContent, { name: 'annotations.json' });

            // 2. Image
            // Image might be "data:image/png;base64,..." or a URL
            if (image.startsWith('data:')) {
                const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
                const imgBuffer = Buffer.from(base64Data, 'base64');
                archive.append(imgBuffer, { name: 'image.png' });
            } else if (image.startsWith('http') || image.startsWith('/')) {
                // It's a URL. In a real app we'd fetch it. 
                // For now, if it's a local public file, we might not have easy access node-side without full path.
                // OPTION: Client should send base64 always for this export feature to be robust.
                // We will simply text-file error if not base64 for now, or assume client converts.
                archive.append(Buffer.from("Image path provided: " + image), { name: 'image_ref.txt' });
            }

            archive.finalize();
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
