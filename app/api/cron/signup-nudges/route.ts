import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runSignupNudges } from "@/lib/email/signupNudges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cloud Scheduler's entry to the day-after signup reminder
 * (lib/email/signupNudges.ts). Same shared secret as the trial reminder:
 * `x-cron-secret` must equal CRON_SECRET, and without it the job is off.
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

    const run = await runSignupNudges("scheduler");
    return NextResponse.json({ ok: run.failures.length === 0, ...run });
}
