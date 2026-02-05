
import { NextRequest, NextResponse } from "next/server";
import { model } from "@/lib/gemini";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, type, count } = body;

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        // Project folder for synthetic text
        const publicDir = path.join(process.cwd(), "public", "synthetic data - text");
        try {
            await fs.access(publicDir);
        } catch {
            await fs.mkdir(publicDir, { recursive: true });
        }

        // Construct System Prompt for Gemini 3 Flash
        const systemPrompt = `
            You are a Synthetic Data Generator for NLP applications.
            Generate high-quality text data based on this request.
            
            Type: ${type || "General Text"}
            Count: ${count || 1} samples (if applicable, otherwise generate one rich document)
            
            User Prompt: "${prompt}"

            Output Format:
            Return the generated text directly. If multiple samples are requested, separate them with "---SAMPLE---".
            Do not include markdown code blocks unless requested.
        `;

        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        const generatedText = response.text();

        // Save to file
        const filename = `synthetic_text_${uuidv4()}.txt`; // or .md / .json based on content
        const filePath = path.join(publicDir, filename);

        await fs.writeFile(filePath, generatedText);

        return NextResponse.json({
            success: true,
            text: generatedText,
            url: `/synthetic data - text/${filename}`,
            filename: filename
        });

    } catch (error: any) {
        console.error("Text Generation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
