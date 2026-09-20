import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runTrialReminders } from "@/lib/email/trialReminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cloud Scheduler's entry to the trial reminder (lib/email/trialReminders.ts).
 *
 * Protected by a shared secret rather than a signed-in user: the caller is
 * a scheduler, not a person. `x-cron-secret` must equal CRON_SECRET; a
 * missing secret on the server disables the job rather than opening it.
 * The console's "Send now" reaches the same job through its own route.
 */
export async function POST(request: Request) {
    const expected = process.env.CRON_SECRET;
    const given = request.headers.get("x-cron-secret") ?? "";
    if (!expected) {
        return NextResponse.json({ error: "CRON_SECRET is not set; the job is off" }, { status: 503 });
    }
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const run = await runTrialReminders("scheduler");
    return NextResponse.json({ ok: run.failures.length === 0, ...run });
}
