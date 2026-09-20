import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { isFeatureEnabled } from "@/lib/featureFlags";
import {
    SCHEDULE,
    WINDOW_AHEAD_HOURS,
    lastTrialReminderRun,
    recentTrialReminders,
    runTrialReminders,
    upcomingTrialReminders,
} from "@/lib/email/trialReminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The console's view of the trial reminder: switch, schedule, last run, who is next, who got one. */
export const GET = withAdmin("announcements.read", async () => {
    const [flagEnabled, lastRun, upcoming, recent] = await Promise.all([
        isFeatureEnabled("trial_reminders"),
        lastTrialReminderRun(),
        upcomingTrialReminders(),
        recentTrialReminders(20),
    ]);
    return NextResponse.json({
        flagEnabled,
        secretSet: Boolean(process.env.CRON_SECRET),
        schedule: SCHEDULE,
        windowHours: WINDOW_AHEAD_HOURS,
        lastRun,
        upcoming,
        recent,
    });
});

/** "Send now": the scheduled run, brought forward. Sends only what the hourly run would. */
export const POST = withAdmin("announcements.send", async (request, admin) => {
    const run = await runTrialReminders(`admin:${admin.email ?? admin.uid}`);
    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "email.trial_reminders.run",
        targetType: "email_template",
        targetId: "trial_ending",
        targetLabel: "Trial ending reminder",
        after: { sent: run.sent, skipped: run.skipped, failures: run.failures.length, flagEnabled: run.flagEnabled },
        ...auditContext(request),
    });
    return NextResponse.json({ ok: run.failures.length === 0, run });
});
