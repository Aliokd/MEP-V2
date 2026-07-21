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
        
        // Forward content-type if valid, otherwise default to audio/webm
        const rawType = response.headers.get('content-type') || '';
        const contentType = (rawType && !rawType.includes('octet-stream')) ? rawType : 'audio/webm';
        headers.set('Content-Type', contentType);
        
        // Enable caching & CORS headers
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', 'public, max-age=3600');

        return new NextResponse(Buffer.from(arrayBuffer), {
            status: 200,
            headers,
        });
    } catch (error: any) {
        console.error('Error proxying audio download:', error);
        return new NextResponse(`Proxy download failed: ${error.message}`, { status: 500 });
    }
}
