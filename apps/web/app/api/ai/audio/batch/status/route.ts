
import { NextRequest, NextResponse } from "next/server";
import { fileManager } from "@/lib/gemini";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const jobId = searchParams.get("id");

        if (!jobId) {
            return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
        }

        // 1. Check Job Status
        const url = `https://generativelanguage.googleapis.com/v1beta/${jobId}?key=${GEMINI_API_KEY}`;
        const response = await fetch(url);
        const jobData = await response.json();

        if (!response.ok) {
            return NextResponse.json({ error: jobData.error?.message || "Failed to fetch job status" }, { status: 500 });
        }

        const state = jobData.state; // PENDING, RUNNING, SUCCEEDED, FAILED, CANCELLED

        if (state === "SUCCEEDED") {
            // 2. Fetch Results
            // The result is usually in output_config.destination or similar for Vertex.
            // In Google AI, success response includes output_config with files.

            const results = [];
            if (jobData.output_config && jobData.output_config.files) {
                // For now, let's assume one output file
                const resultUri = jobData.output_config.files[0];
                // Note: resultUri is a 'files/XXXX' reference

                // Fetch the file content
                const fileUrl = `https://generativelanguage.googleapis.com/v1beta/${resultUri}?key=${GEMINI_API_KEY}&alt=media`;
                const fileResponse = await fetch(fileUrl);
                const fileText = await fileResponse.text();

                // Parse JSONL
                const lines = fileText.trim().split('\n');
                for (const line of lines) {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.response && parsed.response.candidates) {
                            const rawText = parsed.response.candidates[0].content.parts[0].text;

                            // Extract JSON block from markdown if present
                            let jsonString = rawText;
                            const jsonBlock = rawText.match(/```json([\s\S]*?)```/);
                            if (jsonBlock) jsonString = jsonBlock[1];

                            try {
                                const data = JSON.parse(jsonString);
                                let annotations = [];
                                if (data.annotations) annotations = data.annotations;
                                else if (Array.isArray(data)) annotations = data;

                                results.push({
                                    fileName: data.file_name || "unknown",
                                    annotations: annotations.map((item: any, idx: number) => ({
                                        id: idx + 1,
                                        start: (item.start), // Front-end will parse this
                                        end: (item.end),
                                        speaker: item.speaker || "Speaker 1",
                                        word: Array.isArray(item.Transcription) ? item.Transcription.join(" ") : item.Transcription,
                                        type: item.type || "lexical"
                                    }))
                                });
                            } catch (err) {
                                results.push({ error: "Failed to parse inner JSON", raw: rawText });
                            }
                        }
                    } catch (e) {
                        console.error("Error parsing result line", e);
                    }
                }
            }

            return NextResponse.json({
                state,
                results,
                completedAt: jobData.updateTime
            });
        }

        return NextResponse.json({
            state,
            progress: jobData.progress || 0,
            error: jobData.error
        });

    } catch (error: any) {
        console.error("Batch status error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
