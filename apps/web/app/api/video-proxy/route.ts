import { NextRequest, NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const videoUrl = searchParams.get('url');

    if (!videoUrl) {
        return new NextResponse("Missing video URL", { status: 400 });
    }

    if (!apiKey) {
        return new NextResponse("Server configuration error: Missing API Key", { status: 500 });
    }

    try {
        // Fetch the video from Google's servers including the API Key
        // We use the key as a query param or header. The File API usually authenticates via header or key param.
        // Trying x-goog-api-key header first as it's cleaner.
        const response = await fetch(videoUrl, {
            headers: {
                'x-goog-api-key': apiKey
            }
        });

        if (!response.ok) {
            console.error(`[Video Proxy] Failed to fetch video: ${response.status} ${response.statusText}`);
            return new NextResponse(`Failed to fetch video: ${response.statusText}`, { status: response.status });
        }

        // Stream the response back
        const contentType = response.headers.get('content-type') || 'video/mp4';
        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Content-Disposition', 'inline'); // Ensure it plays in browser

        return new NextResponse(response.body, {
            status: 200,
            headers: headers
        });
    } catch (error) {
        console.error("[Video Proxy] Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
