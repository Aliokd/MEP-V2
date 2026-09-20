import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendMail, isMailDryRun } from "@/lib/email/send";
import { trialEndingEmail } from "@/lib/email/templates/trialEnding";
import { resolveLocale } from "@/lib/email/locale";
import { getCopyOverrides } from "@/lib/siteCopy";
import { SITE_URL, localizePath } from "@/lib/i18n";
import { resolveEntitlement } from "@/lib/entitlement";
import { isFeatureEnabled } from "@/lib/featureFlags";

/**
 * The trial reminder, as one job.
 *
 * Run hourly by Cloud Scheduler through /api/cron/trial-reminders, and on
 * demand from the console's Email > Automations panel. Both go through
 * `runTrialReminders`, so "Send now" in the console is the scheduled run
 * brought forward, not a second implementation of it.
 *
 * Who gets it: an account on a no-card trial that ends within the next
 * WINDOW_AHEAD, once. Card trials are Paddle's to remind. The kill switch
 * is the `trial_reminders` feature flag on the Ops page; off, a run records
 * itself as skipped and sends nothing.
 *
 * Every run writes `cron_runs/trial-reminders`, which is what the console
 * shows as "last run".
 */

const HOUR = 60 * 60 * 1000;
export const WINDOW_AHEAD_HOURS = 36;
export const SCHEDULE = { cron: "15 * * * *", timeZone: "Europe/Stockholm", job: "trial-reminders", location: "us-central1" };

export interface ReminderCandidate {
    uid: string;
    email: string | null;
    name: string | null;
    locale: string;
    trialEndsAt: string;
    /** When the reminder went out, or null if it is still owed. */
    reminderSentAt: string | null;
    /** Why this account will not get one, or null when it will. */
    skipReason: "sent" | "no-email" | "not-trial" | "card-trial" | null;
}

export interface ReminderRun {
    at: string;
    trigger: string;
    flagEnabled: boolean;
    dryRun: boolean;
    candidates: number;
    sent: number;
    skipped: number;
    failures: { uid: string; error: string }[];
}

function classify(doc: FirebaseFirestore.QueryDocumentSnapshot, now: number): ReminderCandidate {
    const d = doc.data();
    const billing = d.billing ?? {};
    const ent = resolveEntitlement({
        tier: d.tier ?? null,
        plan: billing.plan ?? null,
        subscriptionStatus: billing.subscriptionStatus ?? null,
        trialEndsAt: billing.trialEndsAt ?? null,
        now,
    });
    let skipReason: ReminderCandidate["skipReason"] = null;
    if (billing.trialReminderSentAt) skipReason = "sent";
    else if (billing.paddleSubscriptionId) skipReason = "card-trial";
    else if (ent.access !== "trial" || ent.paid) skipReason = "not-trial";
    else if (!d.email) skipReason = "no-email";
    return {
        uid: doc.id,
        email: d.email ?? null,
        name: typeof d.name === "string" ? d.name : null,
        locale: resolveLocale(d.locale),
        trialEndsAt: billing.trialEndsAt,
        reminderSentAt: typeof billing.trialReminderSentAt === "string" ? billing.trialReminderSentAt : null,
        skipReason,
    };
}

/** Everyone whose trial ends inside the window, whether or not they will be emailed. */
export async function upcomingTrialReminders(now = Date.now()): Promise<ReminderCandidate[]> {
    const snap = await adminDb
        .collection("users")
        .where("billing.trialEndsAt", ">=", new Date(now).toISOString())
        .where("billing.trialEndsAt", "<=", new Date(now + WINDOW_AHEAD_HOURS * HOUR).toISOString())
        .get();
    return snap.docs.map((doc) => classify(doc, now)).sort((a, b) => a.trialEndsAt.localeCompare(b.trialEndsAt));
}

/** The most recent reminders that went out, newest first. */
export async function recentTrialReminders(limit = 20): Promise<{ uid: string; email: string | null; sentAt: string; trialEndsAt: string | null }[]> {
    const snap = await adminDb
        .collection("users")
        .orderBy("billing.trialReminderSentAt", "desc")
        .limit(limit)
        .get()
        .catch(() => null);
    if (!snap) return [];
    return snap.docs
        .filter((doc) => typeof doc.data().billing?.trialReminderSentAt === "string")
        .map((doc) => ({
            uid: doc.id,
            email: doc.data().email ?? null,
            sentAt: doc.data().billing.trialReminderSentAt,
            trialEndsAt: doc.data().billing?.trialEndsAt ?? null,
        }));
}

export async function lastTrialReminderRun(): Promise<ReminderRun | null> {
    const snap = await adminDb.doc("cron_runs/trial-reminders").get();
    return snap.exists ? (snap.data() as ReminderRun) : null;
}

export async function runTrialReminders(trigger: string): Promise<ReminderRun> {
    const now = Date.now();
    const flagEnabled = await isFeatureEnabled("trial_reminders");
    const dryRun = isMailDryRun();
    const candidates = await upcomingTrialReminders(now);

    const run: ReminderRun = {
        at: new Date(now).toISOString(),
        trigger,
        flagEnabled,
        dryRun,
        candidates: candidates.length,
        sent: 0,
        skipped: 0,
        failures: [],
    };

    if (flagEnabled) {
        const overrides = await getCopyOverrides();
        for (const c of candidates) {
            if (c.skipReason || !c.email) {
                run.skipped += 1;
                continue;
            }
            const locale = c.locale as "en" | "no" | "sv";
            const endsOn = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(new Date(c.trialEndsAt));
            const firstName = c.name?.trim().split(/\s+/)[0] || null;
            const { subject, html, text } = trialEndingEmail(
                locale,
                { name: firstName, endsOn, plansUrl: `${SITE_URL}${localizePath("/platform/profile/settings", locale)}` },
                overrides,
            );
            try {
                await sendMail({ to: c.email, subject, html, text });
                await adminDb.doc(`users/${c.uid}`).set({ billing: { trialReminderSentAt: new Date().toISOString() } }, { merge: true });
                run.sent += 1;
            } catch (err: unknown) {
                run.failures.push({ uid: c.uid, error: err instanceof Error ? err.message : String(err) });
            }
        }
    } else {
        run.skipped = candidates.length;
    }

    await adminDb.doc("cron_runs/trial-reminders").set(run);
    return run;
}
