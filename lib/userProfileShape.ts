import { TERMS_VERSION } from "@/lib/legalVersions";

/**
 * The users/{uid} document as it is born, built in one place.
 *
 * Two code paths create accounts: the browser (Google sign-in, the invite
 * flow) through lib/userProfile.ts, and the server (the onboarding email step)
 * through /api/onboarding/start. Both have to write the same shape or the
 * webhook, the plan hook and the admin console end up reading two kinds of
 * user. No firebase import here so either side can use it.
 */
export interface NewUserProfileInput {
    uid: string;
    name: string;
    email: string;
    // One value per question, except the onboarding struggle deck, which can be
    // answered with several.
    answers?: Record<string, string | string[]>;
    /**
     * How the account came to exist. `onboarding` means the email step made it
     * with no password and a code still to be verified; the flow reads this
     * back to know whether the code screen is owed.
     */
    signup?: {
        method: "onboarding";
        source: string | null;
        verifiedAt: null;
        /** First-touch marketing attribution, as the browser captured it. */
        attribution?: SignupAttribution | null;
    };
    /**
     * When a console-granted trial ends (ISO). Accounts are born without
     * one: a trial starts when the card goes in at the paywall, and Paddle
     * writes that date. Only the admin console passes a value here.
     */
    trialEndsAt?: string | null;
}

/** Where a signup came from, captured on the first page the visitor landed on. */
export interface SignupAttribution {
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmContent: string | null;
    utmTerm: string | null;
    /** Ad click ids, when present: gclid, fbclid, ttclid, msclkid. */
    clickId: string | null;
    clickIdKind: string | null;
    referrer: string | null;
    landingPath: string | null;
    capturedAt: string | null;
}

export function newUserProfile({ uid, name, email, answers, signup, trialEndsAt }: NewUserProfileInput) {
    const now = new Date().toISOString();
    return {
        uid,
        name,
        email,
        answers: answers || {},
        createdAt: now,
        // "trial" is the tier every account is born with. It opens nothing
        // on its own: with no trial date and no subscription the account is
        // "unpaid" (lib/entitlement.ts) until the card goes in.
        tier: "trial",
        lastActiveAt: now,
        // Signup happens behind a "By continuing, you agree to our Terms"
        // notice, so creation is the acceptance. Later sign-ins re-record this
        // when the version bumps. See lib/termsAcceptance.
        terms: {
            acceptedVersion: TERMS_VERSION,
            acceptedAt: now,
        },
        billing: {
            plan: null,
            paddleCustomerId: null,
            paddleSubscriptionId: null,
            subscriptionStatus: null,
            trialEndsAt: trialEndsAt ?? null,
            currentPeriodEnd: null,
            welcomeEmailSent: false,
            trialReminderSentAt: null,
        },
        ...(signup ? { signup } : {}),
    };
}

/** The name an account gets when nobody typed one: the part before the @. */
export function nameFromEmail(email: string): string {
    const local = email.split("@")[0] ?? "";
    return local.trim() || "Guest User";
}
