import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// Allow up to 5 minutes for video generation
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    if (!apiKey) {
        return NextResponse.json({ error: "Server API Key not configured." }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { prompt, aspectRatio, resolution } = body;

        if (!prompt) {
            return NextResponse.json({ error: "Missing required field: prompt" }, { status: 400 });
        }

        const client = new GoogleGenAI({ apiKey });

        console.log(`[Veo API] Starting video generation for: ${prompt}`);

        // Configure video generation
        const config: Record<string, string> = {};
        if (aspectRatio) config.aspectRatio = aspectRatio;
        if (resolution) config.resolution = resolution;

        // Start the video generation operation
        let operation = await client.models.generateVideos({
            model: "veo-3.1-generate-preview",
            prompt: prompt,
            ...(Object.keys(config).length > 0 && { config })
        });

        console.log(`[Veo API] Operation started: ${operation.name}`);

        // Poll for completion - max ~4.5 minutes (27 polls x 10 seconds)
        let pollCount = 0;
        const maxPolls = 27;

        while (!operation.done && pollCount < maxPolls) {
            console.log(`[Veo API] Polling... (${pollCount + 1}/${maxPolls})`);
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            // Use properly typed parameter for get operation
            operation = await client.operations.get({ operation: operation });
            pollCount++;
        }

        if (!operation.done) {
            return NextResponse.json({
                error: "Video generation is taking longer than expected. Please try again.",
                operationName: operation.name
            }, { status: 408 });
        }

        // Get the generated video
        const generatedVideos = operation.response?.generatedVideos;
        if (!generatedVideos || generatedVideos.length === 0) {
            return NextResponse.json({
                error: "No video was generated. The content may have been filtered for safety."
            }, { status: 422 });
        }

        const videoData = generatedVideos[0];
        const video = videoData.video;

        if (!video) {
            return NextResponse.json({
                error: "Video generated but file reference not available."
            }, { status: 500 });
        }

        // The video object should have a URI we can return directly
        // In Gemini API, the video URI is accessible after generation completes
        const videoUri = video.uri;

        console.log(`[Veo API] Video generated successfully: ${videoUri}`);

        return NextResponse.json({
            success: true,
            videoUrl: videoUri,
            message: "Video generated successfully!"
        });

    } catch (error: unknown) {
        const err = error as Error & { message?: string };
        console.error("[Veo API] Error:", err);

        // Handle specific error cases
        if (err.message?.includes("404") || err.message?.includes("not found")) {
            return NextResponse.json({
                error: "Veo 3.1 model not available. Ensure your API key has access to video generation."
            }, { status: 404 });
        }
        if (err.message?.includes("PERMISSION_DENIED")) {
            return NextResponse.json({
                error: "Permission denied. Your API key may not have Veo access."
            }, { status: 403 });
        }
        if (err.message?.includes("quota")) {
            return NextResponse.json({
                error: "API quota exceeded. Please try again later."
            }, { status: 429 });
        }
        if (err.message?.includes("safety") || err.message?.includes("blocked")) {
            return NextResponse.json({
                error: "Content was blocked by safety filters. Try a different prompt."
            }, { status: 451 });
        }

        return NextResponse.json({
            error: err.message || "Video generation failed."
        }, { status: 500 });
    }
}
