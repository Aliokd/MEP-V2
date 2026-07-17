import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    try {
        const response = await fetch(targetUrl);
        if (!response.ok) {
            return new NextResponse(`Failed to fetch remote audio: HTTP ${response.status}`, { status: response.status });
        }

        const arrayBuffer = await response.arrayBuffer();
        const headers = new Headers();
        
        // Forward content-type if available, otherwise default to audio/mpeg
        const contentType = response.headers.get('content-type') || 'audio/mpeg';
        headers.set('Content-Type', contentType);
        
        // Disable caching to get fresh uploads
        headers.set('Cache-Control', 'no-store, max-age=0');

        return new NextResponse(Buffer.from(arrayBuffer), {
            status: 200,
            headers,
        });
    } catch (error: any) {
        console.error('Error proxying audio download:', error);
        return new NextResponse(`Proxy download failed: ${error.message}`, { status: 500 });
    }
}
