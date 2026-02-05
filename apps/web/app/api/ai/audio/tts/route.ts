
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
// We import genAI to ensure we use the same verified instance/key source, 
// though for TTS we are strictly using the REST endpoint for specific model compliance as per docs.
import { genAI } from "@/lib/gemini";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text, voice } = body;

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        // Project folder for synthetic audio
        const publicDir = path.join(process.cwd(), "public", "synthetic-audio");
        try {
            await fs.access(publicDir);
        } catch {
            await fs.mkdir(publicDir, { recursive: true });
        }

        // USER INSTRUCTION: STRICTLY use 'gemini-2.5-flash-preview-tts'
        // Docs: https://ai.google.dev/gemini-api/docs/speech-generation
        const modelName = "models/gemini-2.5-flash-preview-tts";

        // Note: The Node SDK might not fully support the 'generateSpeech' method on the generic model object yet in all versions.
        // We will try to use the REST API approach if SDK fails, or standard SDK if types allow.
        // Checking SDK capabilities... known issue is 'generateContent' is for text/multimodal, speech might be different endpoint.
        // Official docs say: client.models.generate_content(...) ? No, usually it's a specific method.
        // Let's us the REST API to be safe and strictly compliant with the specific model ID.

        const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${genAI.apiKey}`;

        // 2. Build Payload - speechConfig MUST be inside generationConfig for the REST API
        const payload = {
            contents: [{
                parts: [{ text: text }]
            }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: voice || "Puck"
                        }
                    }
                }
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`TTS API Failed: ${errorText}`);
        }

        const result = await response.json();

        // 3. Extract and Process Audio
        const part = result.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        let audioData = part?.data;
        let finalMimeType = part?.mimeType || "audio/wav";

        if (!audioData) {
            throw new Error("No audio data received from Gemini TTS");
        }

        let audioBuffer = Buffer.from(audioData, 'base64');

        // 4. Handle Raw PCM (audio/L16) - Add WAV Header
        // Gemini 2.5 Flash TTS frequently returns raw PCM 16-bit 24kHz Mono.
        // If it's pure PCM (L16), it won't play in browsers unless wrapped in a WAV header.
        if (finalMimeType.includes("L16") || finalMimeType.includes("pcm") || finalMimeType === "audio/wav") {
            // Check if it already has a "RIFF" header
            const magic = audioBuffer.toString('ascii', 0, 4);
            if (magic !== "RIFF") {
                console.log("Wrapping raw PCM in 24kHz Mono 16-bit WAV header...");
                const sampleRate = 24000;
                const channels = 1;
                const bitDepth = 16;

                const header = Buffer.alloc(44);
                header.write("RIFF", 0);
                header.writeUInt32LE(36 + audioBuffer.length, 4);
                header.write("WAVE", 8);
                header.write("fmt ", 12);
                header.writeUInt32LE(16, 16);
                header.writeUInt16LE(1, 20); // PCM format
                header.writeUInt16LE(channels, 22);
                header.writeUInt32LE(sampleRate, 24);
                header.writeUInt32LE(sampleRate * channels * bitDepth / 8, 28);
                header.writeUInt16LE(channels * bitDepth / 8, 32);
                header.writeUInt16LE(bitDepth, 34);
                header.write("data", 36);
                header.writeUInt32LE(audioBuffer.length, 40);

                audioBuffer = Buffer.concat([header, audioBuffer]);
                finalMimeType = "audio/wav";
            }
        }

        const extension = finalMimeType.includes("mp3") ? "mp3" : "wav";
        const filename = `synthetic_audio_${uuidv4()}.${extension}`;
        const filePath = path.join(publicDir, filename);

        await fs.writeFile(filePath, audioBuffer);

        return NextResponse.json({
            success: true,
            audioUrl: `/synthetic-audio/${filename}`,
            filename: filename,
            mimeType: finalMimeType
        });

    } catch (error: any) {
        console.error("TTS Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
