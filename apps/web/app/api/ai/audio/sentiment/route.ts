
import { NextRequest, NextResponse } from "next/server";
import { model, fileManager } from "@/lib/gemini";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

// Creative Transcription + Sentiment Analysis from Audio
export async function POST(req: NextRequest) {
    let tempFilePath: string | null = null;
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const userPrompt = formData.get("prompt") as string || "Analyze the emotional tone and provide a creative transcript.";

        if (!file) {
            return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
        }

        // 1. Save and Upload to Gemini
        const buffer = Buffer.from(await file.arrayBuffer());
        tempFilePath = path.join(os.tmpdir(), `sentiment-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
        await writeFile(tempFilePath, buffer);

        const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: file.type || "audio/mp3",
            displayName: `sentiment_${file.name}`,
        });

        // 2. Wait for file to be active
        let fileStatus = await fileManager.getFile(uploadResult.file.name);
        let attempts = 0;
        while (fileStatus.state !== "ACTIVE" && attempts < 30) {
            if (fileStatus.state === "FAILED") throw new Error("Audio processing failed");
            await new Promise(r => setTimeout(r, 2000));
            fileStatus = await fileManager.getFile(uploadResult.file.name);
            attempts++;
        }

        // 3. Multimodal Analysis Prompt
        const systemPrompt = `
        You are an expert audio analyst and creative transcriptionist specializing in high-fidelity emotional audits.
        
        Task:
        1. Analyze the audio file provided multimodal-ly to capture pitch, tone, and speaker shifts.
        2. Perform "Creative Segmented Sentiment Analysis": Divide the audio into logical emotional segments.
        3. For each segment, provide:
           - Start and End time (format HH:MM:SS)
           - Sentiment (e.g., Happy, Frustrated, Calm, Enthusiastic)
           - Emoji: A relevant emoji for the segment mood.
           - Creative Transcript: A speaker-by-speaker (Person A, Person B, etc.) transcription of this specific segment that captures the essence, tone, and dialogue nuance.
        4. Provide an "Overall Assessment" of the audio recording.
        5. Provide a "Full Creative Transcript": This must be a DRAMATIC, PERSON-TO-PERSON DIALOGUE transcription of the entire audio. 
           - Identify different speakers clearly (e.g., "Speaker 1:", "Speaker 2:").
           - Preserve the flow and conversational turns.
           - It should NOT be a summary; it must be a full-fidelity creative transcription that reads like a screen-play or a high-end podcast transcript.

        User Context: ${userPrompt}

        Return strictly a JSON object with this structure:
        {
            "overall": {
                "sentiment": "string",
                "score": number (0-100),
                "tone": "string",
                "emoji": "string",
                "summary": "string"
            },
            "segments": [
                {
                    "start": "HH:MM:SS",
                    "end": "HH:MM:SS",
                    "sentiment": "string",
                    "emoji": "string",
                    "transcript": "string"
                }
            ],
            "fullTranscript": "string" (Formatted with Speaker names and dialogue lines)
        }
        `;

        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: uploadResult.file.mimeType,
                    fileUri: uploadResult.file.uri
                }
            },
            { text: systemPrompt }
        ]);

        const response = await result.response;
        const responseText = response.text();

        // Robust JSON extraction
        let jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const firstBrace = jsonString.indexOf('{');
        const lastBrace = jsonString.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            jsonString = jsonString.substring(firstBrace, lastBrace + 1);
        }

        const data = JSON.parse(jsonString);
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Sentiment Multimodal Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (tempFilePath) {
            await unlink(tempFilePath).catch(() => { });
        }
    }
}
