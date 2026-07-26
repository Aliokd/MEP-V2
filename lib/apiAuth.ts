import 'server-only';
import { NextResponse } from 'next/server';

/**
 * Firebase ID token verification for the paid AI endpoints.
 *
 * These routes bill real money to Gemini on every call. They were previously
 * unauthenticated, which on the free tier merely meant the shared quota could be
 * drained; once billing is enabled it means anyone who finds the URL can spend
 * money. Rate limiting bounds that, but only identity actually closes it.
 *
 * Unlike featureGuard — which fails *open* so infrastructure trouble can't take
 * a feature down — this fails *closed*. A request that cannot be proven to come
 * from a signed-in user is rejected. Denying a legitimate user during an outage
 * is recoverable; letting an anonymous caller spend money is not.
 */

export interface AuthedUser {
    uid: string;
}

function unauthorized(message: string): Response {
    return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Verifies the bearer token on the request.
 *
 * Returns the caller's identity, or a 401 Response to return directly:
 *
 *   const auth = await requireUser(request);
 *   if (auth instanceof Response) return auth;
 *   // auth.uid is now trustworthy
 */
export async function requireUser(request: Request): Promise<AuthedUser | Response> {
    const header = request.headers.get('authorization') ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());

    if (!match) return unauthorized('Sign in to use this feature.');

    // Imported here, not at module scope: a top-level import that fails to
    // resolve throws while the module loads, taking down every route that
    // imports this one with an unexplained 500. Kept in its OWN try/catch,
    // separate from token verification below: when this import failed in
    // production (the Turbopack external-alias bug), the shared catch blamed
    // the user's token — "Your session has expired" — for what was actually a
    // broken server. A wrong error message costs hours; users refresh and
    // retry forever while the real fault sits elsewhere.
    let adminAuth: (typeof import('@/lib/firebaseAdmin'))['adminAuth'];
    try {
        ({ adminAuth } = await import('@/lib/firebaseAdmin'));
    } catch (error: any) {
        console.error('[apiAuth] firebase-admin failed to load:', error?.message || error);
        return NextResponse.json(
            { error: 'This feature is temporarily unavailable. Please try again shortly.' },
            { status: 503 },
        );
    }

    try {
        const decoded = await adminAuth.verifyIdToken(match[1]);
        return { uid: decoded.uid };
    } catch (error: any) {
        // Expired tokens are routine — the client refreshes and retries — so this
        // is logged at info level rather than as an error.
        console.info('[apiAuth] Rejected token:', error?.code || error?.message || error);
        return unauthorized('Your session has expired. Please refresh and try again.');
    }
}
