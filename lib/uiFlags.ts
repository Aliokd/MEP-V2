/**
 * Build-time UI flags, safe to import from client components.
 *
 * Distinct from lib/featureFlags.ts, which is `server-only` and reads runtime
 * kill switches out of Firestore for the AI endpoints. These are plain
 * constants: flipping one is a code change and a deploy, nothing more.
 */

import { localizePath, type Language } from './i18n';

/**
 * Master switch for the Practice tab. Set to false to lock it behind a
 * "coming soon" screen and grey out its sidebar entry while the sessions are
 * being rebuilt; true serves the real PracticeTab. Nothing else needs to
 * change either way.
 */
export const PRACTICE_ENABLED: boolean = true;

/**
 * Practice 3 (Melody variations), gated by environment rather than by hand:
 * the exercise is built and stays fully playable in development, but a
 * production build locks its card behind a plain "Coming soon" — the melody
 * recordings it needs are still placeholders, and shipping an exercise around
 * synthesised beeps would make the practice read as broken rather than early.
 * `NODE_ENV` is inlined at build time, so flipping this on for real is either
 * deleting the check or waiting for the recordings and doing the same.
 */
export const MELODY_VARIATIONS_ENABLED: boolean = process.env.NODE_ENV !== 'production';

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
 * The ANCHOR of the special offer's rolling global window, as an ISO timestamp
 * with a timezone. The first close was the anchor itself; each time a close
 * passes, the window re-arms exactly 72h later (see currentDeadline in
 * CountdownBanner) — pure arithmetic from this constant, so every visitor
 * worldwide reads the same clock and it never parks at 00:00:00. It did
 * exactly that under live ads on 2026-08-25 when this was a fixed deadline;
 * the rolling window is what replaced the babysitting.
 *
 * To close the offer for real, that is a screen to design, not a value here.
 * Null falls back to a per-visitor 72h window anchored in localStorage —
 * review mode, not something to ship while ads run.
 */
export const WAITLIST_COUNTDOWN_ENDS_AT: string | null = '2026-09-19T00:00:00Z';

/**
 * Launch day, as YYYY-MM-DD. Distinct from the countdown above: that one is the
 * special offer's own window, which closes for each visitor a day after they
 * see it; this is the single fixed date the whole waitlist is waiting for, and
 * it is what the campaign's confirmation screen promises.
 *
 * Formatted per locale where it is shown, so this stays a date rather than a
 * sentence — see WaitlistSecured.
 */
export const LAUNCH_DATE: string = '2026-09-19';

/**
 * The founding cohort, as one number in one place.
 *
 * Two surfaces show it — the homepage's urgency section and the campaign's join
 * dialog — and they are one click apart now that every CTA leads from the first
 * to the second. Two copies of "87" drifting into "87 here, 79 there" is the
 * failure this exists to prevent, so both read these and the remainder is
 * derived rather than written into the copy.
 */
export const FOUNDER_SPOTS_TAKEN = 49;
export const FOUNDER_SPOTS_TOTAL = 100;
export const FOUNDER_SPOTS_LEFT = FOUNDER_SPOTS_TOTAL - FOUNDER_SPOTS_TAKEN;

/**
 * Where every "Join the waitlist" button on the marketing site goes: the
 * campaign flow, not the bare form.
 *
 * They used to land on /waiting-list — one field and a button. That page still
 * exists and still works (the invite email and the signed-out Google path use
 * it), but a visitor who arrives with enough interest to press a CTA is worth
 * showing what they are joining: the five slides, the quiz, and the offer with
 * its clock. The address is captured at the end of that either way, by the same
 * API, so nothing is lost by the longer road.
 *
 * `source` is kept as `?from=` and recorded on the waitlist row, so the admin
 * list still says which surface each person came from. Add any new value to
 * KNOWN_SOURCES in app/api/waitlist/route.ts or it lands as "direct".
 */
export function waitlistJoinPath(source: string, language?: Language): string {
    const base = language ? localizePath('/onboarding', language) : '/onboarding';
    return `${base}?flow=waitlist&from=${encodeURIComponent(source)}`;
}

/**
 * Where an invited person who has no Veinote account yet is sent.
 *
 * While signups are closed that is the waiting list; once they reopen it is the
 * onboarding flow, which ends in a real account. `?from=invite` matches the
 * attribution the other waiting-list entry points already use, and `?invite=`
 * carries the invitation id so the destination can say who invited them.
 */
/**
 * Whether a project can be shared with an address that has no Veinote account.
 *
 * That path is the only part of collaboration that depends on outbound mail: the
 * invitee has no workspace to see a notification in, so the email IS the
 * invitation. SMTP_PASS is not configured in CI, so the mail silently fails —
 * and the flow's own success message ("An email has been sent to …") would be
 * untrue. Rather than record invitations nobody is ever told about, that branch
 * is refused outright while this is false.
 *
 * Everything else about collaboration is unaffected and stays on: inviting
 * someone who already has an account reaches them through an in-app
 * notification and never touches the mailer.
 *
 * Flip to true once SMTP_PASS is set as a repository secret and outbound mail is
 * confirmed working — see the deploy workflow's secret check.
 */
export const COLLAB_EMAIL_INVITES_ENABLED: boolean = false;

export function inviteLandingPath(inviteId?: string): string {
    const base = SIGNUPS_OPEN ? '/onboarding' : '/waiting-list';
    const query = inviteId ? `?from=invite&invite=${encodeURIComponent(inviteId)}` : '?from=invite';
    return `${base}${query}`;
}
