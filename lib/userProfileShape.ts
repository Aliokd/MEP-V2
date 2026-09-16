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
    };
}

export function newUserProfile({ uid, name, email, answers, signup }: NewUserProfileInput) {
    const now = new Date().toISOString();
    return {
        uid,
        name,
        email,
        answers: answers || {},
        createdAt: now,
        // "trial" is the tier of an account that has not paid yet. It grants
        // nothing on its own: the trial that opens the product is the Paddle
        // subscription's own, written into `billing` by the webhook.
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
            trialEndsAt: null,
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
