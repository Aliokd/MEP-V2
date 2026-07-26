import { auth } from "@/lib/firebase";

/**
 * fetch() with the signed-in user's Firebase ID token attached, so the server can
 * verify who is calling instead of trusting a uid sent in the request body.
 * Falls back to an unauthenticated request when nobody is signed in.
 */
export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    // Only a string body is assumed to be JSON. Binary bodies (Blob/ArrayBuffer for
    // audio uploads) and FormData must keep the Content-Type the browser derives —
    // FormData needs its multipart boundary, and mislabelling audio as JSON makes
    // the receiving route try to parse it as JSON.
    if (typeof init.body === "string" && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const current = auth.currentUser;
    if (current) {
        try {
            headers.set("Authorization", `Bearer ${await current.getIdToken()}`);
        } catch (err) {
            console.error("Failed to attach ID token to request:", err);
        }
    }

    return fetch(input, { ...init, headers });
}
