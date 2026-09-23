import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { isFeatureEnabled } from "@/lib/featureFlags";
import {
    NUDGE_AFTER_HOURS,
    NUDGE_SCHEDULE,
    NUDGE_UNTIL_HOURS,
    lastNudgeRun,
    nudgeCandidates,
    nudgeOutcomes,
    runSignupNudges,
} from "@/lib/email/signupNudges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The console's view of the unfinished-signup reminder: switch, schedule, last run, who, and whether it works. */
export const GET = withAdmin("announcements.read", async () => {
    const [flagEnabled, lastRun, candidates, outcomes] = await Promise.all([
        isFeatureEnabled("signup_nudges"),
        lastNudgeRun(),
        nudgeCandidates(),
        nudgeOutcomes(),
    ]);
    return NextResponse.json({
        flagEnabled,
        secretSet: Boolean(process.env.CRON_SECRET),
        schedule: NUDGE_SCHEDULE,
        afterHours: NUDGE_AFTER_HOURS,
        untilHours: NUDGE_UNTIL_HOURS,
        lastRun,
        candidates,
        outcomes,
    });
});

/** "Send now": the scheduled run, brought forward. Sends only to signups at least a day old. */
export const POST = withAdmin("announcements.send", async (request, admin) => {
    const run = await runSignupNudges(`admin:${admin.email ?? admin.uid}`);
    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "email.signup_nudges.run",
        targetType: "email_template",
        targetId: "signup_nudge",
        targetLabel: "Unfinished signup reminder",
        after: { sent: run.sent, skipped: run.skipped, failures: run.failures.length, flagEnabled: run.flagEnabled },
        ...auditContext(request),
    });
    return NextResponse.json({ ok: run.failures.length === 0, run });
});
