import { NextResponse } from "next/server";
import { rateLimitGuard } from "@/lib/rateLimit";
import { findTicketByCode } from "@/lib/goldenTickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What a golden code is worth, asked by the onboarding flow on arrival with
 * `?golden=` so it can address the person by name and skip the plans.
 *
 * Read-only and unauthenticated (the person has no account yet), so it is
 * rate-limited by IP and says as little as it can: whether the code is live,
 * and the first name on the ticket. Every miss is the same `valid: false`;
 * a code that has already been redeemed is a miss too, since the flow has
 * nothing to do with it.
 */
export async function GET(request: Request) {
    const throttled = rateLimitGuard(request, "golden-lookup");
    if (throttled) return throttled;

    const code = new URL(request.url).searchParams.get("code") ?? "";
    try {
        const ticket = await findTicketByCode(code);
        if (!ticket || ticket.status === "revoked" || ticket.status === "redeemed") {
            return NextResponse.json({ valid: false });
        }
        return NextResponse.json({ valid: true, name: ticket.name, invites: ticket.invites });
    } catch (err) {
        console.error("[golden/lookup] failed:", err);
        return NextResponse.json({ valid: false });
    }
}
