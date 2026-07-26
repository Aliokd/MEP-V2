import { auth } from "@/lib/firebase";

/**
 * fetch() with the signed-in user's Firebase ID token attached, so the server can
 * verify who is calling instead of trusting a uid sent in the request body.
 * Falls back to an unauthenticated request when nobody is signed in.
 */
export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

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
