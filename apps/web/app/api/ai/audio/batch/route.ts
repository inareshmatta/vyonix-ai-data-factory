
import { NextRequest, NextResponse } from "next/server";
import { fileManager } from "@/lib/gemini";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { generateASRPrompt, generateASRPromptV4, AUDIO_PROMPT_V1, AUDIO_PROMPT_V2 } from "@/lib/prompts";

// Gemini API Key for direct REST calls
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const files = formData.getAll("files") as File[];
        const promptVersion = formData.get("promptVersion") as string || "v1";
        const taskType = (formData.get("taskType") as "word" | "paragraph") || "word";

        if (!files || files.length === 0) {
            return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
        }

        console.log(`[Batch API] Processing ${files.length} files for batch job...`);

        const requests = [];

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const tempFilePath = path.join(os.tmpdir(), `batch-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
            await writeFile(tempFilePath, buffer);

            // Upload to Gemini
            const uploadResult = await fileManager.uploadFile(tempFilePath, {
                mimeType: file.type || "audio/mp3",
                displayName: file.name,
            });

            // Cleanup temp
            await unlink(tempFilePath).catch(e => console.error("Temp cleanup failed", e));

            // Determine prompt
            let prompt = AUDIO_PROMPT_V1;
            // Note: For batch, we might not have the duration upfront unless we probe it. 
            // Most prompts work find without precise duration if we use "END OF FILE" default.
            if (promptVersion === "v2") prompt = AUDIO_PROMPT_V2.replace(/{INSERT_DURATION_HERE}/g, "END OF FILE");
            else if (promptVersion === "v3") prompt = generateASRPrompt(file.name, "END OF FILE", taskType);
            else if (promptVersion === "v4") prompt = generateASRPromptV4(file.name, "END OF FILE", taskType);

            requests.push({
                request: {
                    contents: [
                        {
                            role: "user",
                            parts: [
                                {
                                    fileData: {
                                        fileUri: uploadResult.file.uri,
                                        mimeType: uploadResult.file.mimeType
                                    }
                                },
                                { text: prompt }
                            ]
                        }
                    ]
                }
            });
        }

        // 2. Create JSONL content
        const jsonlContent = requests.map(r => JSON.stringify(r)).join('\n');
        const jsonlPath = path.join(os.tmpdir(), `job-${Date.now()}.jsonl`);
        await writeFile(jsonlPath, jsonlContent);

        // 3. Upload JSONL to Gemini File API
        const jsonlUpload = await fileManager.uploadFile(jsonlPath, {
            mimeType: "application/json",
            displayName: `batch_job_${Date.now()}.jsonl`
        });
        await unlink(jsonlPath).catch(() => { });

        // 4. Create Batch Job via REST API (SDK doesn't have it easily available in this version)
        const modelName = "models/gemini-3-flash-preview"; // Updated to Gemini 3 as per strict user instruction
        const url = `https://generativelanguage.googleapis.com/v1beta/batchJobs?key=${GEMINI_API_KEY}`;

        const batchJobRequest = {
            model: modelName,
            input_config: {
                source: jsonlUpload.file.uri,
                response_format: "JSONL"
            },
            output_config: {
                // In Google AI Studio, output destination is managed by the system
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batchJobRequest)
        });

        const jobData = await response.json();

        if (!response.ok) {
            console.error("[Batch API] Error creating job:", jobData);
            return NextResponse.json({ error: jobData.error?.message || "Failed to create batch job" }, { status: 500 });
        }

        console.log(`[Batch API] Job created: ${jobData.name}`);

        return NextResponse.json({
            batchJobId: jobData.name, // Format: batchJobs/XXXX
            state: jobData.state,
            createdAt: jobData.createTime
        });

    } catch (error: any) {
        console.error("Batch processing error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
