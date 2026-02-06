
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
    console.warn("GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");
const fileManager = new GoogleAIFileManager(apiKey || "");


// Vyonix Intelligence Engine - Proprietary Edition
// JSON mode model for structured outputs (text, vision)
const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: {
        responseMimeType: "application/json",
    }
}, {
    timeout: 3600000 // 60 minutes
});

// Text mode model for streaming (audio) - no JSON constraint
const textModel = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
}, {
    timeout: 3600000 // 60 minutes
});

const imageGenerationModel = genAI.getGenerativeModel({
    model: "gemini-3-pro-image-preview",
    generationConfig: {
        // @ts-ignore
        responseModalities: ["image"],
        temperature: 0.9
    }
});

const ttsModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-tts",
});




export { model, textModel, imageGenerationModel, ttsModel, genAI, fileManager };
