'use server';

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

/**
 * Generate a video using Veo 3.1 model.
 * Uses the generateVideos API with async polling.
 */
export async function generateVideoWithVeo(prompt: string): Promise<{ videoUrl?: string; error?: string }> {
    if (!apiKey) {
        return { error: "Server API Key not configured." };
    }

    try {
        const client = new GoogleGenAI({ apiKey });

        console.log(`[Veo] Starting video generation for: ${prompt}`);

        // Start the video generation operation
        let operation = await client.models.generateVideos({
            model: "veo-3.1-generate-preview",
            prompt: prompt,
        });

        console.log(`[Veo] Operation started: ${operation.name}`);

        // Poll for completion - max 5 minutes (30 polls x 10 seconds)
        let pollCount = 0;
        const maxPolls = 30;

        while (!operation.done && pollCount < maxPolls) {
            console.log(`[Veo] Polling... (${pollCount + 1}/${maxPolls})`);
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            operation = await client.operations.get({ operation });
            pollCount++;
        }

        if (!operation.done) {
            return { error: "Video generation timed out. Please try again." };
        }

        // Get the generated video
        const generatedVideos = operation.response?.generatedVideos;
        if (!generatedVideos || generatedVideos.length === 0) {
            return { error: "No video was generated. The model may have filtered the content." };
        }

        const videoData = generatedVideos[0];
        const video = videoData.video;

        if (!video) {
            return { error: "Video generated but file reference not available." };
        }

        // The video object should have a URI we can return directly
        const videoUri = video.uri;

        if (!videoUri) {
            return { error: "Video generated but URI not available." };
        }

        console.log(`[Veo] Video generated successfully: ${videoUri}`);
        return { videoUrl: videoUri };

    } catch (error: unknown) {
        const err = error as Error & { message?: string };
        console.error("[Veo] Error:", err);

        // Handle specific error cases
        if (err.message?.includes("404") || err.message?.includes("not found")) {
            return { error: "Veo model not available. Check if your API key has access to video generation." };
        }
        if (err.message?.includes("PERMISSION_DENIED")) {
            return { error: "Permission denied. Your API key may not have access to Veo video generation." };
        }
        if (err.message?.includes("quota")) {
            return { error: "API quota exceeded. Please try again later." };
        }
        if (err.message?.includes("safety") || err.message?.includes("blocked")) {
            return { error: "Content was blocked by safety filters. Try a different prompt." };
        }

        return { error: err.message || "Video generation failed." };
    }
}
