import { NextRequest, NextResponse } from "next/server";
import { textModel, fileManager } from "@/lib/gemini";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { JobStorage } from "@/lib/storage";
import { AUDIO_PROMPT_V1, AUDIO_PROMPT_V2, generateASRPrompt, generateASRPromptV4 } from "@/lib/prompts";

// Increase max duration to 5 minutes 
export const maxDuration = 300;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Write to temp file for upload
        const tempFilePath = path.join(os.tmpdir(), `audio-upload-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
        await writeFile(tempFilePath, buffer);

        console.log(`[Audio API] Temp file written to: ${tempFilePath}`);

        // Upload to Gemini
        console.log(`[Audio API] Uploading to Gemini File API...`);
        const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: file.type || "audio/mp3",
            displayName: file.name,
        });

        const fileUri = uploadResult.file.uri;
        const uploadName = uploadResult.file.name;
        console.log(`[Audio API] Upload complete. URI: ${fileUri}`);

        // Poll for active state
        let fileState = uploadResult.file.state;
        const pollingStart = Date.now();
        console.log(`[Audio API] Initial file state: ${fileState}`);

        // Wait for file to be active
        while (fileState !== "ACTIVE") {
            if (fileState === "FAILED") {
                throw new Error("Audio file processing failed on Gemini server.");
            }
            if (Date.now() - pollingStart > 60000) {
                throw new Error("Timeout waiting for audio file processing.");
            }
            console.log("[Audio API] Waiting for audio file processing...");
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Poll every 2s

            const fileStatus = await fileManager.getFile(uploadName);
            fileState = fileStatus.state;
            console.log(`[Audio API] Current file state: ${fileState}`);
        }

        console.log("[Audio API] File is ACTIVE. Starting inference...");

        const promptVersion = formData.get("promptVersion") as string || "v1";
        const duration = formData.get("duration") as string || "END OF FILE";
        const taskType = (formData.get("taskType") as "word" | "paragraph") || "word";

        console.log(`[Audio API] File active. Prompt version: ${promptVersion}, Duration: ${duration}`);

        let prompt = AUDIO_PROMPT_V1;
        if (promptVersion === "v2") {
            prompt = AUDIO_PROMPT_V2.replace(/{INSERT_DURATION_HERE}/g, duration);
        } else if (promptVersion === "v3") {
            prompt = generateASRPrompt(file.name, duration, taskType);
        } else if (promptVersion === "v4") {
            prompt = generateASRPromptV4(file.name, duration, taskType);
        }

        // Generate content
        const startTime = Date.now();
        const result = await textModel.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            fileData: {
                                mimeType: uploadResult.file.mimeType,
                                fileUri: fileUri
                            }
                        },
                        { text: prompt }
                    ]
                }
            ]
        });

        const response = result.response;
        const text = response.text();
        const usage = response.usageMetadata;

        console.log(`[Audio API] Response received. Total duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

        // Cleanup temp file
        await unlink(tempFilePath).catch((err) => console.error("Failed to delete temp file:", err));

        // Helper to parse HH:MM:SS.mmm to milliseconds
        const parseTimestamp = (ts: string) => {
            if (!ts) return 0;
            const parts = ts.split(':');
            if (parts.length < 3) return 0;
            const hours = parseInt(parts[0]);
            const minutes = parseInt(parts[1]);
            const seconds = parseFloat(parts[2]);
            return (hours * 3600 + minutes * 60 + seconds) * 1000;
        };

        try {
            let data: any[] = [];
            const trimmedText = text.trim();

            // Robust JSON extraction
            let jsonString = "";
            const jsonBlockMatch = trimmedText.match(/```json([\s\S]*?)```/);

            if (jsonBlockMatch && jsonBlockMatch[1]) {
                jsonString = jsonBlockMatch[1];
            } else {
                // Fallback: find first { and last }
                const firstBrace = trimmedText.indexOf('{');
                const lastBrace = trimmedText.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    jsonString = trimmedText.substring(firstBrace, lastBrace + 1);
                } else {
                    jsonString = trimmedText; // Attempt full text if no boundaries found
                }
            }

            console.log("[Audio API] Extracted JSON string length:", jsonString.length);

            let parsed: any;
            try {
                parsed = JSON.parse(jsonString);
            } catch (jsonErr) {
                console.error("[Audio API] JSON parse failed:", jsonErr);
                console.log("[Audio API] Raw text snippet:", text.substring(0, 500));

                // Last ditch effort: Try to clean common trailing commas or errors if needed
                // For now, let's just log it.
            }

            if (parsed) {
                if (parsed.annotations && Array.isArray(parsed.annotations)) {
                    data = parsed.annotations;
                } else if (Array.isArray(parsed)) {
                    data = parsed;
                } else if (parsed.files && Array.isArray(parsed.files)) {
                    data = parsed.files[0]?.annotations || [];
                }
            }

            // Map to internal format (Milliseconds for Frontend/Player)
            const sanitizedData = data.map((item, index) => ({
                id: index + 1,
                start: parseTimestamp(item.start),
                end: parseTimestamp(item.end),
                speaker: item.speaker || "Speaker 1",
                word: Array.isArray(item.Transcription) ? item.Transcription.join(" ") : item.Transcription,
                type: item.type || "lexical"
            }));

            // Map to Storage format (Preserve HH:MM:SS strings for JSON artifact)
            const formattedData = data.map((item, index) => ({
                id: index + 1,
                start: item.start, // Keep original string
                end: item.end,     // Keep original string
                speaker: item.speaker || "Speaker 1",
                word: Array.isArray(item.Transcription) ? item.Transcription.join(" ") : item.Transcription,
                type: item.type || "lexical"
            }));

            // Save Job Artifacts Locally
            console.log("[Audio API] Saving job artifacts...");
            let jobInfo = { jobId: "ephemeral_" + Date.now(), zipPath: "" };

            try {
                const info = await JobStorage.saveJob(
                    buffer,
                    file.name,
                    formattedData, // Save the version with string timestamps
                    {
                        status: 'completed',
                        durationMs: Date.now() - startTime,
                        tokenUsage: {
                            input: usage?.promptTokenCount || 0,
                            output: usage?.candidatesTokenCount || 0,
                            total: usage?.totalTokenCount || 0
                        }
                    }
                );
                jobInfo = info;
            } catch (storageErr) {
                console.warn("[Audio API] Note: Failed to save persistent history.", storageErr);
            }

            // Generate downloadable ZIP as Base64 for compatibility
            const downloadJsonString = JSON.stringify(formattedData, null, 2);
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, "");

            // Create ZIP in memory
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
                // Add JSON annotations
                archive.append(downloadJsonString, { name: `${safeName}.json` });

                archive.finalize();
            });

            return NextResponse.json({
                data: sanitizedData,
                jobId: jobInfo.jobId,
                zipPath: jobInfo.zipPath,
                // Return ZIP directly so frontend can download without second request
                zipBase64: zipBase64,
                zipFileName: `${safeName}_vyonix.zip`
            });

        } catch (e) {
            console.error("Parsing error", e);
            return NextResponse.json({ error: "Failed to parse AI response", raw: text.substring(0, 5000) }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Error processing audio:", error);

        // Scrub model info from user-facing errors
        const message = error.message || "Unknown error";
        const scrubbed = message
            .replace(/Gemini/gi, "Vyonix")
            .replace(/Google/gi, "Vyonix")
            .replace(/gemini-3-flash-preview/gi, "Vyonix-Intelligence")
            .replace(/generativelanguage\.googleapis\.com/gi, "api.vyonix.ai");

        return NextResponse.json({ error: scrubbed }, { status: 500 });
    }
}
