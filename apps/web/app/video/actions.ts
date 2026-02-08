'use server';

import { GoogleGenerativeAI, Part } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

/**
 * Analyze video with Gemini for object detection or transcription.
 * Uses inline video data for files < 20MB.
 */
export async function analyzeVideoWithGemini(base64Data: string, mimeType: string, prompt: string) {
    if (!apiKey) {
        console.error("[Gemini] No API key found in environment.");
        return { error: "Server API Key not configured. Please set GEMINI_API_KEY." };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Using gemini-2.0-flash for stable video understanding
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        console.log(`[Gemini] Sending video analysis request. MimeType: ${mimeType}, Prompt: ${prompt.substring(0, 100)}...`);

        // Construct the request with inline video data
        const videoPart: Part = {
            inlineData: {
                data: base64Data,
                mimeType: mimeType
            }
        };

        const textPart: Part = {
            text: prompt
        };

        const result = await model.generateContent([videoPart, textPart]);
        const response = await result.response;
        const text = response.text();

        console.log(`[Gemini] Received response: ${text.substring(0, 200)}...`);

        return { text };
    } catch (error: any) {
        console.error("[Gemini] API Error:", error.message || error);
        // Provide more specific error messages
        if (error.message?.includes("API key")) {
            return { error: "Invalid API key. Please check your GEMINI_API_KEY." };
        }
        if (error.message?.includes("quota")) {
            return { error: "API quota exceeded. Please try again later." };
        }
        if (error.message?.includes("size")) {
            return { error: "Video file too large. Please use a smaller video (< 20MB)." };
        }
        return { error: error.message || "Failed to analyze video. Check server logs." };
    }
}
