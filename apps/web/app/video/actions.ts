'use server';

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

/**
 * Analyze video with Gemini using the File API for larger files.
 * The file is uploaded first, then analyzed.
 */
export async function analyzeVideoWithGemini(base64Data: string, mimeType: string, prompt: string) {
    if (!apiKey) {
        console.error("[Gemini] No API key found in environment.");
        return { error: "Server API Key not configured. Please set GEMINI_API_KEY." };
    }

    try {
        const client = new GoogleGenAI({ apiKey });

        console.log(`[Gemini] Sending video analysis request. MimeType: ${mimeType}, Prompt: ${prompt.substring(0, 100)}...`);
        console.log(`[Gemini] Base64 data length: ${base64Data.length} characters`);

        // Size check - Server Actions have ~4MB limit for payload
        // Base64 is ~1.33x the original file size, so we need to be conservative
        const estimatedFileSizeBytes = (base64Data.length * 3) / 4;
        console.log(`[Gemini] Estimated file size: ${(estimatedFileSizeBytes / 1024 / 1024).toFixed(2)} MB`);

        if (estimatedFileSizeBytes > 15 * 1024 * 1024) { // 15MB limit for inline
            return { error: "Video too large. Please use a file smaller than 15MB." };
        }

        // For smaller videos, use inline data with proper Part format
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
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
        console.log(`[Gemini] Received response: ${text?.substring(0, 200)}...`);

        return { text };
    } catch (error: any) {
        console.error("[Gemini] API Error:", error.message || error);
        console.error("[Gemini] Full error:", JSON.stringify(error, null, 2));

        // Provide specific error messages
        if (error.message?.includes("API key")) {
            return { error: "Invalid API key. Please check your GEMINI_API_KEY." };
        }
        if (error.message?.includes("quota")) {
            return { error: "API quota exceeded. Please try again later." };
        }
        if (error.message?.includes("size") || error.message?.includes("too large")) {
            return { error: "Video file too large. Please use a smaller video (< 10MB)." };
        }
        if (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("SERVICE_DISABLED")) {
            return { error: "Generative Language API not enabled. Please enable it in Google Cloud Console." };
        }
        if (error.message?.includes("nesting") || error.message?.includes("array")) {
            return { error: "Video too complex for inline processing. Try a shorter or smaller video." };
        }
        return { error: error.message || "Failed to analyze video. Check server logs." };
    }
}
