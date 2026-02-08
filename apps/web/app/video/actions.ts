'use server';

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

/**
 * Analyze video with Gemini using the NEW @google/genai SDK.
 * For videos < 20MB, uses inline data. For larger videos, use File API.
 */
export async function analyzeVideoWithGemini(base64Data: string, mimeType: string, prompt: string) {
    if (!apiKey) {
        console.error("[Gemini] No API key found in environment.");
        return { error: "Server API Key not configured. Please set GEMINI_API_KEY." };
    }

    try {
        const client = new GoogleGenAI({ apiKey });

        console.log(`[Gemini] Sending video analysis request. MimeType: ${mimeType}, Prompt: ${prompt.substring(0, 100)}...`);

        // Using new SDK format per official docs
        const response = await client.models.generateContent({
            model: "gemini-2.0-flash",
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

        // Provide specific error messages
        if (error.message?.includes("API key")) {
            return { error: "Invalid API key. Please check your GEMINI_API_KEY." };
        }
        if (error.message?.includes("quota")) {
            return { error: "API quota exceeded. Please try again later." };
        }
        if (error.message?.includes("size") || error.message?.includes("too large")) {
            return { error: "Video file too large. Please use a smaller video (< 20MB)." };
        }
        if (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("SERVICE_DISABLED")) {
            return { error: "Generative Language API not enabled. Please enable it in Google Cloud Console." };
        }
        return { error: error.message || "Failed to analyze video. Check server logs." };
    }
}
