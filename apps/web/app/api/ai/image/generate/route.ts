
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { imageGenerationModel } from "@/lib/gemini";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { object, location, background, count } = body;

        if (!object) {
            return NextResponse.json({ error: "Object is required" }, { status: 400 });
        }

        // Project folder for synthetic data
        const publicDir = path.join(process.cwd(), "public", "synthetic-data-images");

        try {
            await fs.access(publicDir);
        } catch {
            await fs.mkdir(publicDir, { recursive: true });
        }

        const images = [];
        const modelName = "gemini-3-pro-image-preview";
        console.log(`[Vyonix-Intelligence-GenAI] Initializing model: ${modelName}`);

        // Construct the prompt
        // Since we are using a "Pro" model, we can include the detailed instructions directly in the generation request
        const combinedPrompt = `
            Create a highly detailed, photorealistic image of: ${object}
            Context: ${location}
            Style/Background: ${background}
            
            Quality: 8k, highly detailed, cinematic lighting, professional photography.
        `;

        console.log(`[Vyonix-Intelligence-GenAI] Generating ${count || 1} images...`);

        for (let i = 0; i < (count || 1); i++) {
            const filename = `synthetic_${uuidv4()}.png`; // Usually returns PNG or WEBP
            const filePath = path.join(publicDir, filename);

            try {
                // Call Gemini API for Image Generation
                const result = await imageGenerationModel.generateContent(combinedPrompt);
                const response = await result.response;

                // Inspect response for image data
                // Image generation models usually return candidates with 'content' containing 'parts' with 'inlineData' { mac: ..., data: ... }
                // or sometimes 'fileData' depending on the response version.

                // We will check for the standard inlineData structure.
                let imageBase64: string | null = null;

                if (response.candidates && response.candidates.length > 0) {
                    const parts = response.candidates[0].content.parts;
                    for (const part of parts) {
                        if (part.inlineData && part.inlineData.data) {
                            imageBase64 = part.inlineData.data;
                            break;
                        }
                    }
                }

                if (imageBase64) {
                    // Cloud Run is ephemeral, so saving files to 'public' usually doesn't work as expected 
                    // (they don't persist and aren't served correctly if not present at build time).
                    // We will return the image directly as a Base64 Data URI.
                    const mimeType = "image/png"; // Gemini usually returns PNG data
                    const dataUri = `data:${mimeType};base64,${imageBase64}`;
                    images.push(dataUri);

                    // Optional: Try to save locally just for debugging if running locally, avoids crash on cloud if fail
                    try {
                        // Only try to write if we are local (we can't easily detect, but we can catch the error)
                        // Actually, for Cloud Run production stability, let's skip File IO entirely.
                    } catch (e) {
                        // ignore
                    }

                } else {
                    // If SDK fails to parse standard structure, try checking text for "I cannot generate images" error
                    const text = response.text ? response.text() : "No text response";
                    console.error(`Gemini Generation Failed (No Image Data): ${text}`);
                    throw new Error(`Model returned no image data. Response: ${text.substring(0, 100)}...`);
                }

            } catch (err: any) {
                console.error(`Generation attempt ${i} failed:`, err);
                // If the specific "gemini-3-pro-image-preview" model identifier is invalid/refused by the API key tier,
                // we must fail as per user instructions "strictly only gemini...".
                // We will try one fallback mapping just in case the user meant 'imagen-3.0-generate-001' which is the actual backend usually.

                // However, user said "strictly gemini 3 flash nano banana pro". 
                // If the first call fails, we might try the *text* model 'gemini-1.5-flash' to *ask* for an image uri if it supports tools,
                // but 'gemini-3-pro-image-preview' is the most direct map.

                // If this fails, we throw.
                throw new Error(`Failed to generate with ${modelName}: ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            images,
            count: images.length,
            model: "Vyonix-Intelligence-GenAI (Gemini 3 Pro Image / Nano Banana Pro)",
            prompt: combinedPrompt
        });

    } catch (error: any) {
        console.error("Image generation FATAL error:", error);
        return NextResponse.json({ error: `Generation failed: ${error.message}` }, { status: 500 });
    }
}
