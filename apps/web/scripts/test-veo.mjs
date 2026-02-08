import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Parse .env manually to avoid dependency
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');

let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
        const match = line.match(/^(GEMINI_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY)=(.*)$/);
        if (match) {
            apiKey = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes if any
            break;
        }
    }
}

if (!apiKey) {
    console.error("No API key found in process.env or .env.local");
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey });

async function testVeo() {
    console.log("🚀 Starting Veo 3.1 Test...");
    console.log("Authentication check passed.");

    try {
        console.log("🎥 Generating video (this may take 1-2 mins)...");
        const prompt = "A futuristic city with flying cars, cinematic lighting, 4k";

        // Start generation
        let operation = await client.models.generateVideos({
            model: "veo-3.1-generate-preview",
            prompt: prompt,
        });

        console.log(`✅ Operation started: ${operation.name}`);

        // Poll
        while (!operation.done) {
            process.stdout.write(".");
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await client.operations.get({ operation });
        }
        console.log("\n✅ Generation complete!");

        const videos = operation.response?.generatedVideos;
        if (!videos || videos.length === 0) {
            console.error("❌ No videos returned.");
            return;
        }

        const videoUri = videos[0].video.uri;
        console.log(`🔗 Video URI: ${videoUri}`);

        // Test Download Access
        console.log("⬇️ Testing download access...");

        // Method 1: Using SDK (Should work)
        // await client.files.download({ file: videos[0].video }); 
        // We want to test the raw fetch access for our proxy

        const response = await fetch(videoUri, {
            headers: {
                'x-goog-api-key': apiKey
            }
        });

        if (response.ok) {
            console.log("✅ Download Access OK (200 OK)");
            const buffer = await response.arrayBuffer();
            console.log(`📦 Downloaded ${buffer.byteLength} bytes`);

            const outPath = path.resolve(__dirname, 'test-output.mp4');
            fs.writeFileSync(outPath, Buffer.from(buffer));
            console.log(`💾 Saved to ${outPath}`);
        } else {
            console.error(`❌ Download Failed: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error("Response:", text);
        }

    } catch (error) {
        console.error("❌ Test Failed:", error);
    }
}

testVeo();
