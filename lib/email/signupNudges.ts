import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendMail, isMailDryRun } from "@/lib/email/send";
import { signupNudgeEmail } from "@/lib/email/templates/signupNudge";
import { resolveLocale } from "@/lib/email/locale";
import { unsubscribeUrl } from "@/lib/email/campaigns";
import { getCopyOverrides } from "@/lib/siteCopy";
import { SITE_URL, localizePath } from "@/lib/i18n";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { issueResumeToken } from "@/lib/onboardingResume";
import { TRIAL_DAYS } from "@/lib/paddle/config";

/**
 * The day-after reminder for signups that stopped after the email step.
 *
 * Someone who typed an address into onboarding and left has an account
 * (the email step makes one, so the checkout has somewhere to attach) but
 * no verified address, no card and no trial. A day later, once, they get
 * an email saying where they stopped, what is waiting, and that the first
 * TRIAL_DAYS days are free with a card; its button is a one-time link that
 * finishes the verification and puts them back at the same step with their
 * answers (lib/onboardingResume.ts).
 *
 * Run hourly by Cloud Scheduler (/api/cron/signup-nudges) and on demand
 * from Email > Automations; both call `runSignupNudges`. Kill switch: the
 * `signup_nudges` feature flag. Respects the account's email opt-out.
 * Every run writes `cron_runs/signup-nudges`.
 */

const HOUR = 60 * 60 * 1000;
/** Sent once the account is this old... */
export const NUDGE_AFTER_HOURS = 24;
/** ...and no later than this, so a stale signup from last month is left alone. */
export const NUDGE_UNTIL_HOURS = 7 * 24;
export const NUDGE_SCHEDULE = { cron: "45 * * * *", timeZone: "Europe/Stockholm", job: "signup-nudges", location: "us-central1" };

export interface NudgeCandidate {
    uid: string;
    email: string | null;
    name: string | null;
    locale: string;
    createdAt: string;
    lastStep: string | null;
    source: string | null;
    nudgeSentAt: string | null;
    /** Why this account will not get one, or null when it will (or already did). */
    skipReason: "sent" | "finished" | "has-card" | "opted-out" | "no-email" | "too-new" | null;
}

export interface NudgeRun {
    at: string;
    trigger: string;
    flagEnabled: boolean;
    dryRun: boolean;
    candidates: number;
    sent: number;
    skipped: number;
    failures: { uid: string; error: string }[];
}

function classify(doc: FirebaseFirestore.QueryDocumentSnapshot, now: number): NudgeCandidate | null {
    const d = doc.data();
    const signup = d.signup ?? {};
    if (signup.method !== "onboarding") return null;
    const created = Date.parse(d.createdAt ?? "");
    let skipReason: NudgeCandidate["skipReason"] = null;
    if (signup.nudgeSentAt) skipReason = "sent";
    else if (signup.verifiedAt) skipReason = "finished";
    else if (d.billing?.paddleSubscriptionId) skipReason = "has-card";
    else if (d.emailOptOut === true) skipReason = "opted-out";
    else if (!d.email) skipReason = "no-email";
    else if (!Number.isNaN(created) && now - created < NUDGE_AFTER_HOURS * HOUR) skipReason = "too-new";
    return {
        uid: doc.id,
        email: d.email ?? null,
        name: typeof d.name === "string" ? d.name : null,
        locale: resolveLocale(d.locale),
        createdAt: d.createdAt,
        lastStep: typeof signup.lastStep === "string" ? signup.lastStep : null,
        source: typeof signup.source === "string" ? signup.source : null,
        nudgeSentAt: typeof signup.nudgeSentAt === "string" ? signup.nudgeSentAt : null,
        skipReason,
    };
}

/**
 * Every onboarding signup from the last week, due or not. Includes the
 * ones younger than a day ("too-new") so the console shows who is coming up.
 */
export async function nudgeCandidates(now = Date.now()): Promise<NudgeCandidate[]> {
    const snap = await adminDb
        .collection("users")
        .where("createdAt", ">=", new Date(now - NUDGE_UNTIL_HOURS * HOUR).toISOString())
        .get();
    return snap.docs
        .map((doc) => classify(doc, now))
        .filter((c): c is NudgeCandidate => c !== null && c.skipReason !== "finished")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function lastNudgeRun(): Promise<NudgeRun | null> {
    const snap = await adminDb.doc("cron_runs/signup-nudges").get();
    return snap.exists ? (snap.data() as NudgeRun) : null;
}

/** Nudged signups, and whether the link brought them back. */
export async function nudgeOutcomes(): Promise<{ sent: number; returned: number; paid: number }> {
    const snap = await adminDb.collection("users").where("signup.nudgeSentAt", ">=", "").get().catch(() => null);
    if (!snap) return { sent: 0, returned: 0, paid: 0 };
    let returned = 0;
    let paid = 0;
    snap.docs.forEach((doc) => {
        const d = doc.data();
        if (d.signup?.verifiedAt) returned += 1;
        if (d.billing?.paddleSubscriptionId) paid += 1;
    });
    return { sent: snap.size, returned, paid };
}

export async function runSignupNudges(trigger: string): Promise<NudgeRun> {
    const now = Date.now();
    const flagEnabled = await isFeatureEnabled("signup_nudges");
    const candidates = await nudgeCandidates(now);
    const due = candidates.filter((c) => c.skipReason === null);

    const run: NudgeRun = {
        at: new Date(now).toISOString(),
        trigger,
        flagEnabled,
        dryRun: isMailDryRun(),
        candidates: candidates.length,
        sent: 0,
        skipped: candidates.length - due.length,
        failures: [],
    };

    if (!flagEnabled) {
        run.skipped = candidates.length;
    } else {
        const overrides = await getCopyOverrides();
        for (const c of due) {
            const locale = c.locale as "en" | "no" | "sv";
            try {
                const token = await issueResumeToken(c.uid, c.email!);
                const resumeUrl = `${SITE_URL}${localizePath("/onboarding", locale)}?resume=${encodeURIComponent(token)}`;
                const firstName = c.name?.trim().split(/\s+/)[0] || null;
                // An account named from its address ("julius.theone3") has
                // no first name worth greeting; the plain greeting reads better.
                const greetName = firstName && c.email && firstName === c.email.split("@")[0] ? null : firstName;
                const { subject, html, text } = signupNudgeEmail(
                    locale,
                    { name: greetName, days: TRIAL_DAYS, resumeUrl, unsubscribeUrl: unsubscribeUrl(c.uid) },
                    overrides,
                );
                await sendMail({ to: c.email!, subject, html, text });
                await adminDb.doc(`users/${c.uid}`).set({ signup: { nudgeSentAt: new Date().toISOString() } }, { merge: true });
                run.sent += 1;
            } catch (err: unknown) {
                run.failures.push({ uid: c.uid, error: err instanceof Error ? err.message : String(err) });
            }
        }
    }

    await adminDb.doc("cron_runs/signup-nudges").set(run);
    return run;
}
