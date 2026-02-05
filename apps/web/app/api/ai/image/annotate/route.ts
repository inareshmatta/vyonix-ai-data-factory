
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { image, prompt } = body; // image can be base64

        if (!image) {
            return NextResponse.json({ error: "Image data required" }, { status: 400 });
        }

        // Use core Gemini 3 Flash Preview for Multimodal tasks
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        // If image is a data URL, strip header
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        const result = await model.generateContent([
            `Analyze this image and detect objects relevant to this prompt: "${prompt || "all objects"}".
            
            Return a JSON list of bounding boxes.
            Format:
            [
                {
                    "label": "Object Name",
                    "ymin": number (0-1000),
                    "xmin": number (0-1000),
                    "ymax": number (0-1000),
                    "xmax": number (0-1000),
                    "confidence": number (0-1)
                }
            ]
            Normalize coordinates to 1000x1000 scale.
            `,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/png"
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();
        const data = JSON.parse(text);

        return NextResponse.json({ annotations: data });

    } catch (error: any) {
        console.error("Annotation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
