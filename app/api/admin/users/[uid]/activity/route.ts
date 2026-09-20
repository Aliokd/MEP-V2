import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { isPostHogQueryConfigured, userActivity } from "@/lib/posthogServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ uid: string }> };

/**
 * What PostHog knows about one account: last seen, how often they come,
 * what they open, and the first-touch tags on the person. Fetched by the
 * user drawer on demand rather than with the profile, since it is a
 * round trip to another service.
 */
export const GET = withAdmin("users.read", async (_request, _admin, ctx: Ctx) => {
    const { uid } = await ctx.params;
    if (!isPostHogQueryConfigured()) {
        return NextResponse.json({ configured: false });
    }
    try {
        const activity = await userActivity(uid);
        return NextResponse.json({ configured: true, ...activity });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[admin/users/activity]", message);
        return NextResponse.json({ configured: true, error: message }, { status: 502 });
    }
});
