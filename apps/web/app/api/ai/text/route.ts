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
    Perform high-precision Named Entity Recognition (NER), PII detection, and Semantic Analysis on the document provided.
    
    CRITICAL INSTRUCTIONS:
    1. EXTREME PRECISION: Character indices ("start" and "end") must be EXACTLY correct relative to the "text" field you provide.
    2. FULL TEXT: Capture every paragraph. The "text" field for each block must be the verbatim original text.
    3. SENTIMENT & SUMMARY: Analyze the overall document sentiment and provide a concise summary.
    4. RELATIONS: Identify key relationships between entities (e.g., "Steve Jobs" -> "FOUNDED" -> "Apple").
    
    Identify: PERSON, ORGANIZATION, LOCATION, GPE, DATE, MONEY, EMAIL, PHONE, SSN, PRODUCT.
    
    Return the response ONLY in this JSON format:
    {
      "summary": string (3-5 sentence summary of the document),
      "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
      "topics": string[] (Array of top 5-7 key topics/themes),
      "relations": [
        {
          "source": string (Entity 1 text),
          "target": string (Entity 2 text),
          "relation": string (Relationship type, e.g. "WORKS_FOR", "LOCATED_IN")
        }
      ],
      "blocks": [
        {
          "text": string (Full original paragraph),
          "type": "header" | "paragraph",
          "entities": [
            {
              "mention": string (The exact text string detected),
              "start": number (0-based start index),
              "end": number (0-based end index),
              "label": string (e.g., "PERSON"),
              "redaction": boolean
            }
          ]
        }
      ]
    }
    
    Do not wrap in markdown.
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

        // Find object bounds
        const firstBrace = jsonString.indexOf('{');
        const lastBrace = jsonString.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            jsonString = jsonString.substring(firstBrace, lastBrace + 1);
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
