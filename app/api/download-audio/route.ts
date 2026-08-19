import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/apiAuth';
import { rateLimitGuard } from '@/lib/rateLimit';
import { fetchAllowedUrl, vetRemoteUrl } from '@/lib/safeRemoteUrl';

/**
 * CORS bypass for audio this project stores in its own Firebase Storage bucket.
 *
 * The studio needs the raw bytes to decode into an AudioBuffer, and Storage's
 * CORS configuration does not always allow a direct browser read, so the fetch
 * is made here instead.
 *
 * This route used to take any `url` and return the response body verbatim, with
 * no authentication, no rate limit, and Access-Control-Allow-Origin: *. That is
 * an open proxy: anyone who found the URL could use veinote.com to fetch
 * arbitrary internal or third-party content with our server as the source
 * address, and read the result. It is now restricted on four axes — who may
 * call it, how often, which hosts it will fetch, and how much it will return.
 */

// Comfortably above a long lossless take, far below anything worth proxying.
const MAX_BYTES = 60 * 1024 * 1024;

export async function GET(req: NextRequest) {
    // The bytes this returns are a signed-in user's own project audio, so the
    // caller has to be signed in. There is no anonymous listening surface here.
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;

    const limited = rateLimitGuard(req, 'download-audio', auth.uid);
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const vetted = vetRemoteUrl(searchParams.get('url'));
    if (!vetted.ok) {
        return new NextResponse(vetted.reason || 'Invalid url', { status: 400 });
    }

    try {
        const response = await fetchAllowedUrl(vetted.url!);

        // redirect: 'manual' surfaces a 3xx as an opaque response rather than
        // following it — treat that as a refusal, not as content.
        if (response.status >= 300 && response.status < 400) {
            return new NextResponse('Refusing to follow redirect', { status: 502 });
        }
        if (!response.ok) {
            return new NextResponse(`Failed to fetch remote audio: HTTP ${response.status}`, { status: 502 });
        }

        const declared = Number(response.headers.get('content-length') || 0);
        if (declared > MAX_BYTES) {
            return new NextResponse('Remote audio is too large to proxy', { status: 413 });
        }

        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_BYTES) {
            return new NextResponse('Remote audio is too large to proxy', { status: 413 });
        }

        const headers = new Headers();

        // Pin the response to an audio type. Echoing the upstream content-type
        // would let a stored file dictate how the browser interprets the bytes
        // coming back from our own origin.
        const rawType = response.headers.get('content-type') || '';
        const contentType = /^audio\/[\w.+-]+$/i.test(rawType) ? rawType : 'audio/webm';
        headers.set('Content-Type', contentType);
        headers.set('X-Content-Type-Options', 'nosniff');

        // Same-origin only, and private: this is one user's audio, so it must not
        // sit in a shared cache. The previous `ACAO: *` + `public` combination
        // published it to any site that cared to ask.
        headers.set('Cache-Control', 'private, max-age=3600');

        return new NextResponse(Buffer.from(arrayBuffer), { status: 200, headers });
    } catch (error: any) {
        // The upstream URL and error detail stay in the server log; the caller
        // gets a flat failure so this cannot be used to probe what is reachable.
        console.error('Error proxying audio download:', error?.message || error);
        return new NextResponse('Proxy download failed', { status: 502 });
    }
}
