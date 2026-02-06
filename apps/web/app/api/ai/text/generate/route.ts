
import { NextRequest, NextResponse } from "next/server";
import { textModel } from "@/lib/gemini";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, type, count } = body;

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
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

        const result = await textModel.generateContent(systemPrompt);
        const response = await result.response;
        const generatedText = response.text();

        // Generate filename for client-side use
        const filename = `synthetic_text_${uuidv4()}.txt`;

        // Return text directly - no file save needed for Cloud Run
        return NextResponse.json({
            success: true,
            text: generatedText,
            filename: filename
        });

    } catch (error: any) {
        console.error("Text Generation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
