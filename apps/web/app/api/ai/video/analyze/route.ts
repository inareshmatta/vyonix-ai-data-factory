import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

export const maxDuration = 60; // Allow longer processing time
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    if (!apiKey) {
        return NextResponse.json({ error: "Server API Key not configured." }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { base64Data, mimeType, prompt } = body;

        if (!base64Data || !mimeType || !prompt) {
            return NextResponse.json({ error: "Missing required fields: base64Data, mimeType, prompt" }, { status: 400 });
        }

        const client = new GoogleGenAI({ apiKey });

        console.log(`[Video API] Processing request. MimeType: ${mimeType}, Prompt: ${prompt.substring(0, 100)}...`);
        console.log(`[Video API] Base64 length: ${base64Data.length} chars`);

        // Size check
        const estimatedFileSizeBytes = (base64Data.length * 3) / 4;
        if (estimatedFileSizeBytes > 20 * 1024 * 1024) {
            return NextResponse.json({ error: "Video too large. Please use a file smaller than 20MB." }, { status: 400 });
        }

        const response = await client.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: mimeType
                            }
                        },
                        {
                            text: prompt
                        }
                    ]
                }
            ]
        });

        const text = response.text;
        console.log(`[Video API] Response: ${text?.substring(0, 200)}...`);

        return NextResponse.json({ text });

    } catch (error: any) {
        console.error("[Video API] Error:", error.message || error);

        if (error.message?.includes("API key")) {
            return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
        }
        if (error.message?.includes("quota")) {
            return NextResponse.json({ error: "API quota exceeded." }, { status: 429 });
        }
        if (error.message?.includes("PERMISSION_DENIED")) {
            return NextResponse.json({ error: "Generative Language API not enabled." }, { status: 403 });
        }

        return NextResponse.json({ error: error.message || "Failed to analyze video." }, { status: 500 });
    }
}
