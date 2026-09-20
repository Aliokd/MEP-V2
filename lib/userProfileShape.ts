import { TERMS_VERSION } from "@/lib/legalVersions";
import { defaultTrialEnd } from "@/lib/entitlement";

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
     * When the trial ends (ISO). The server stamps TRIAL_DAYS from now unless
     * told otherwise (an invited account may get longer). Left null only by
     * a client-side create, which the rules keep from setting it; the plan
     * hook then asks /api/account/start-trial to stamp it.
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
        // "trial" is the tier every account is born with: full access until
        // `billing.trialEndsAt`, then the plans. A Paddle trial, once a card
        // is entered, replaces the date with Paddle's own.
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
            trialEndsAt: trialEndsAt === undefined ? defaultTrialEnd() : trialEndsAt,
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
