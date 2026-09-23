import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { nameFromEmail } from "@/lib/userProfileShape";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Addresses that are always stand-ins, whoever made them. */
const DEV_DOMAIN = "@veinote.test";

/**
 * The simulated "Continue with Google" for development (lib/googleSignIn.ts).
 *
 * Mints a custom token for a stand-in account, creating it the first time,
 * so a developer lands in the same signed-in state Google's popup would give.
 * Development talks to the production Firebase project, so the route is
 * careful about whose account it will hand out: an existing account is only
 * signed into when it is a stand-in (an @veinote.test address, or one this
 * route created, which carries the devSim claim). A real songwriter's
 * account is refused, so a typo in the prompt cannot become a session as
 * someone else.
 *
 * Not reachable in production: `next build` sets NODE_ENV to production,
 * and the route answers 404 there before reading anything.
 */
export async function POST(request: Request) {
    if (process.env.NODE_ENV === "production") {
        return new NextResponse(null, { status: 404 });
    }

    let email = "";
    try {
        const body = (await request.json()) as { email?: unknown };
        email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    } catch {
        /* falls through to invalid-email */
    }
    if (!EMAIL_PATTERN.test(email)) {
        return NextResponse.json({ error: "invalid-email" }, { status: 400 });
    }

    try {
        let isNewUser = false;
        let user = await adminAuth.getUserByEmail(email).catch(() => null);

        if (user) {
            const standIn = user.customClaims?.devSim === true || email.endsWith(DEV_DOMAIN);
            if (!standIn) {
                return NextResponse.json({ error: "not-a-simulated-account" }, { status: 403 });
            }
        } else {
            user = await adminAuth.createUser({
                email,
                emailVerified: true,
                displayName: nameFromEmail(email),
            });
            await adminAuth.setCustomUserClaims(user.uid, { devSim: true });
            isNewUser = true;
        }

        const token = await adminAuth.createCustomToken(user.uid, { devSim: true });
        return NextResponse.json({ token, isNewUser });
    } catch (error) {
        console.error("[dev/google-sign-in] failed:", error);
        return NextResponse.json({ error: "failed" }, { status: 500 });
    }
}
