
import { NextRequest, NextResponse } from "next/server";
import { model } from "@/lib/gemini";

function fileToGenerativePart(buffer: Buffer, mimeType: string) {
    return {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType,
        },
    };
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const imagePart = fileToGenerativePart(buffer, file.type);

        const prompt = `
    Analyze this image for object detection. Identify distinct objects like products, price tags, shelves, or people.

    Return the response ONLY in this JSON format:
    [
      {
        "id": number,
        "label": string (name of the object),
        "conf": number (confidence score 0.0-1.0),
        "ymin": number (0-1000, top edge),
        "xmin": number (0-1000, left edge),
        "ymax": number (0-1000, bottom edge),
        "xmax": number (0-1000, right edge),
        "attr": string (optional description)
      }
    ]
    
    IMPORTANT: Provide NORMALIZED coordinates in the 0-1000 range.
    * 0,0 is top-left.
    * 1000,1000 is bottom-right.
    * Do not estimate based on pixels, use the relative position within the image frame.

    If no objects are found, return an empty array.
    Do not wrap the JSON in markdown code blocks.
    `;

        const result = await model.generateContent([prompt, imagePart]);
        const response = result.response;
        const text = response.text();

        // Robust JSON extraction
        let jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();

        // Find array bounds if extra text exists
        const firstBracket = jsonString.indexOf('[');
        const lastBracket = jsonString.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1) {
            jsonString = jsonString.substring(firstBracket, lastBracket + 1);
        }

        try {
            const data = JSON.parse(jsonString);
            return NextResponse.json(data);
        } catch (e) {
            console.error("JSON parsing error", e, text);
            return NextResponse.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Error processing image:", error);

        // Scrub model info from user-facing errors
        const message = error.message || "Unknown error";
        const scrubbed = message
            .replace(/Gemini/gi, "Vyonix")
            .replace(/Google/gi, "Vyonix")
            .replace(/gemini-3-flash-preview/gi, "Vyonix-Intelligence")
            .replace(/generativelanguage\.googleapis\.com/gi, "api.vyonix.ai");

        return NextResponse.json({ error: scrubbed }, { status: 500 });
    }
}
