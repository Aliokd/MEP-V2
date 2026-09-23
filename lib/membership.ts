import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import { resolveEntitlement } from "@/lib/entitlement";

/**
 * Whether an account appears to other songwriters (Connect's roster and
 * map), written onto its public profile.
 *
 * Connect reads `publicProfiles`, which carries no billing: other people's
 * `users` documents are private. So the answer is copied across, by the
 * server only (the rules keep `member` and `memberUntil` out of clients'
 * hands), from the same lib/entitlement.ts the platform gates on:
 *
 *   member       true while the account has access: a trial, a plan, or a grant.
 *   memberUntil  when a console-granted trial ends, so the listing lapses on
 *                its own date without anything having to run. Null otherwise;
 *                Paddle's own changes arrive through the webhook.
 *
 * An account that typed an email into onboarding and left, or whose trial
 * or subscription ran out, is not a member and is not listed.
 *
 * Called wherever access changes: the Paddle sync (webhook and console
 * refresh), the console's tier and trial edits, account creation from the
 * console, and the golden grants. `scripts/backfill-membership.mjs` sets it
 * for everyone at once.
 */

export interface Membership {
    member: boolean;
    memberUntil: string | null;
}

/** The slice of users/{uid} that decides membership. */
interface MembershipSource {
    tier?: string | null;
    billing?: { plan?: string | null; subscriptionStatus?: string | null; trialEndsAt?: string | null } | null;
    signup?: { method?: string; verifiedAt?: string | null } | null;
}

export function membershipOf(user: MembershipSource | undefined, now = Date.now()): Membership {
    if (!user) return { member: false, memberUntil: null };
    const billing = user.billing ?? {};
    const ent = resolveEntitlement({
        tier: user.tier ?? null,
        plan: billing.plan ?? null,
        subscriptionStatus: billing.subscriptionStatus ?? null,
        trialEndsAt: billing.trialEndsAt ?? null,
        now,
    });
    const unfinished = user.signup?.method === "onboarding" && !user.signup?.verifiedAt;
    const member = !unfinished && (ent.access === "trial" || ent.access === "veinote" || ent.access === "pro");
    // Only a trial nobody pays for needs its own end date here; a Paddle
    // trial ends through the webhook, which rewrites this.
    const memberUntil = member && ent.source === "trial" && !ent.paid ? ent.trialEndsAt : null;
    return { member, memberUntil };
}

/** Reads the account and writes its listing. Never throws: a listing is not worth failing a grant over. */
export async function syncMembership(uid: string): Promise<Membership | null> {
    try {
        const snap = await adminDb.doc(`users/${uid}`).get();
        const m = membershipOf(snap.exists ? (snap.data() as MembershipSource) : undefined);
        await adminDb.doc(`publicProfiles/${uid}`).set(m, { merge: true });
        return m;
    } catch (err) {
        console.error(`[membership] could not sync ${uid}:`, err);
        return null;
    }
}
