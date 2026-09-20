import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { isPostHogQueryConfigured, trafficSummary } from "@/lib/posthogServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Traffic and the onboarding funnel, read from PostHog.
 *
 * Complements /api/admin/analytics, which only knows accounts: this is the
 * part before an account exists. Says `configured: false` when the server
 * has no PostHog read key, so the page can explain rather than show zeros.
 */
export const GET = withAdmin("analytics.read", async (request) => {
    if (!isPostHogQueryConfigured()) {
        return NextResponse.json({ configured: false });
    }
    const url = new URL(request.url);
    const days = Math.min(Number(url.searchParams.get("days")) || 30, 180);
    try {
        const summary = await trafficSummary(days);
        return NextResponse.json({ configured: true, ...summary });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[admin/analytics/traffic]", message);
        return NextResponse.json({ configured: true, error: message }, { status: 502 });
    }
});
