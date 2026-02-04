import { NextRequest, NextResponse } from "next/server";
import { model, fileManager } from "@/lib/gemini";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

// Increase max duration to 5 minutes 
export const maxDuration = 300;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Write to temp file for upload
        const tempFilePath = path.join(os.tmpdir(), `upload-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
        await writeFile(tempFilePath, buffer);

        console.log(`[Text API] Temp file written to: ${tempFilePath}`);

        // Upload to Gemini
        console.log(`[Text API] Uploading to Gemini File API...`);
        const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: file.type || "text/plain",
            displayName: file.name,
        });

        console.log(`[Text API] Upload complete. URI: ${uploadResult.file.uri}`);

        const prompt = `
    Perform Named Entity Recognition (NER) and PII detection on the ENTIRE document provided.
    It is CRITICAL that you do not truncate the response. Capture every paragraph and header.
    
    Identify entities like PERSON, ORGANIZATION, DATE, LOCATION, GPE, MONEY, EMAIL, PHONE, PRODUCT, and SSN.
    
    Return the response ONLY in this JSON format:
    [
      {
        "text": string (The original full paragraph or line of text),
        "type": "header" | "paragraph",
        "entities": [
          {
            "start": number (start index in the 'text' string),
            "end": number (end index in the 'text' string),
            "label": string (e.g., "PERSON", "PHONE"),
            "redaction": boolean (true if PII/Sensitive)
          }
        ]
      }
    ]
    
    Split the document into its original logical blocks (headers, paragraphs).
    Ensure the "text" field contains the FULL original text of that block.
    Do not wrap the JSON in markdown code blocks.
        `;

        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: uploadResult.file.mimeType,
                    fileUri: uploadResult.file.uri
                }
            },
            { text: prompt }
        ]);

        const response = result.response;
        const text = response.text();

        // Cleanup temp file
        await unlink(tempFilePath).catch((err) => console.error("Failed to delete temp file:", err));

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
        console.error("Error processing text:", error);

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
