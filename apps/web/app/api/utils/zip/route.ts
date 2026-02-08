
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const jsonContent = formData.get("json") as string;
        const jsonName = formData.get("jsonName") as string || "data.json";
        const file = formData.get("file") as File | null;

        if (!jsonContent || !file) {
            return NextResponse.json({ error: "Missing json or file" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Create ZIP using archiver
        const archiver = require('archiver');
        const { PassThrough } = require('stream');

        const zipBase64 = await new Promise<string>((resolve, reject) => {
            const chunks: Buffer[] = [];
            const passThrough = new PassThrough();

            passThrough.on('data', (chunk: Buffer) => chunks.push(chunk));
            passThrough.on('end', () => {
                const zipBuffer = Buffer.concat(chunks);
                resolve(zipBuffer.toString('base64'));
            });
            passThrough.on('error', reject);

            const archive = archiver('zip', { zlib: { level: 9 } });
            archive.on('error', reject);
            archive.pipe(passThrough);

            // Add audio file
            archive.append(buffer, { name: file.name });
            // Add JSON
            archive.append(jsonContent, { name: jsonName });

            archive.finalize();
        });

        // Return Base64 so client can download
        return NextResponse.json({
            success: true,
            zipBase64,
            filename: `${file.name.replace(/\.[^/.]+$/, "")}_updated.zip`
        });

    } catch (error: any) {
        console.error("ZIP creation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
