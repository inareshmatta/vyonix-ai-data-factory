'use server';

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

/**
 * Generate a synthetic video using Veo 3.1.
 * This is an async operation that requires polling.
 */
export async function generateVideoWithVeo(prompt: string): Promise<{ videoUrl?: string; error?: string }> {
    if (!apiKey) {
        console.error("[Veo] No API key found in environment.");
        return { error: "Server API Key not configured. Please set GEMINI_API_KEY." };
    }

    try {
        const ai = new GoogleGenAI({ apiKey });

        console.log(`[Veo] Starting video generation with prompt: ${prompt.substring(0, 100)}...`);

        // Start the video generation operation
        let operation = await ai.models.generateVideos({
            model: "veo-3.1-generate-preview",
            prompt: prompt,
        });

        // Poll the operation status until the video is ready
        let attempts = 0;
        const maxAttempts = 60; // Max 10 minutes (60 * 10s)

        while (!operation.done && attempts < maxAttempts) {
            console.log(`[Veo] Waiting for video generation (attempt ${attempts + 1})...`);
            await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
            operation = await ai.operations.getVideosOperation({ operation });
            attempts++;
        }

        if (!operation.done) {
            return { error: "Video generation timed out. Please try again." };
        }

        // Get the generated video
        const generatedVideo = operation.response?.generatedVideos?.[0];
        if (!generatedVideo || !generatedVideo.video) {
            return { error: "No video was generated. The prompt may have been filtered." };
        }

        // Return the video file URI (client can use this to download/display)
        const videoUri = generatedVideo.video.uri || generatedVideo.video.name;
        console.log(`[Veo] Video generated successfully: ${videoUri}`);

        // For web display, we need to convert to a data URL or provide a download mechanism
        // The video is stored in Google's Files API - we need to fetch it
        if (generatedVideo.video.uri) {
            return { videoUrl: generatedVideo.video.uri };
        }

        return { error: "Could not retrieve video URL from response." };

    } catch (error: any) {
        console.error("[Veo] Generation Error:", error.message || error);
        if (error.message?.includes("API key")) {
            return { error: "Invalid API key. Please check your GEMINI_API_KEY." };
        }
        if (error.message?.includes("quota")) {
            return { error: "API quota exceeded. Video generation is resource-intensive." };
        }
        if (error.message?.includes("safety") || error.message?.includes("blocked")) {
            return { error: "Content was blocked by safety filters. Please modify your prompt." };
        }
        return { error: error.message || "Failed to generate video. Check server logs." };
    }
}
