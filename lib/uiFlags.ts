/**
 * Build-time UI flags, safe to import from client components.
 *
 * Distinct from lib/featureFlags.ts, which is `server-only` and reads runtime
 * kill switches out of Firestore for the AI endpoints. These are plain
 * constants: flipping one is a code change and a deploy, nothing more.
 */

/**
 * Master switch for the Practice tab. Set to false to lock it behind a
 * "coming soon" screen and grey out its sidebar entry while the sessions are
 * being rebuilt; true serves the real PracticeTab. Nothing else needs to
 * change either way.
 */
export const PRACTICE_ENABLED: boolean = true;

/**
 * Pre-launch: the onboarding flow itself is public so the draft can be shared and
 * reviewed, but the account step is closed. Reviewers walk every screen —
 * including the offer, the plans and the welcome — while the two steps that would
 * touch the outside world are skipped: no Firebase account is created and Paddle
 * is never opened. `Pay $0.00` goes straight to the welcome screen, which swaps
 * its door into the product for the waiting list.
 *
 * Flip to `true` to reopen public signups. Nothing else needs changing: the
 * signup form and the checkout call are both still wired up behind this flag.
 *
 * Lives here rather than in app/onboarding/page.tsx because the collaboration
 * invite email has to point somewhere too, and sending an invitee to a signup
 * form that cannot create an account is worse than sending them to the list.
 */
export const SIGNUPS_OPEN: boolean = false;

/**
 * Where an invited person who has no Veinote account yet is sent.
 *
 * While signups are closed that is the waiting list; once they reopen it is the
 * onboarding flow, which ends in a real account. `?from=invite` matches the
 * attribution the other waiting-list entry points already use, and `?invite=`
 * carries the invitation id so the destination can say who invited them.
 */
export function inviteLandingPath(inviteId?: string): string {
    const base = SIGNUPS_OPEN ? '/onboarding' : '/waiting-list';
    const query = inviteId ? `?from=invite&invite=${encodeURIComponent(inviteId)}` : '?from=invite';
    return `${base}${query}`;
}
