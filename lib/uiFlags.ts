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
 * Practice 3 (Melody variations). Live everywhere now that real melodies are
 * authored in the admin console.
 *
 * It was environment-gated while the only melodies were the synthesised
 * placeholders in app/platform/practice/data/melodies.ts, whose WAVs .gitignore
 * keeps out of the repo — shipping that would have been four cards with dead
 * audio. What unblocked it is the console's `practice_melodies` collection:
 * useMelodyLibrary replaces the bundled list with the authored one whenever the
 * fetch returns anything, so production plays real takes and the bundled four
 * remain a development fallback only.
 *
 * Which means this depends on that collection staying populated. Empty it and
 * the fallback comes back — and in production that fallback is silent.
 */
export const MELODY_VARIATIONS_ENABLED: boolean = true;

/**
 * Whether the onboarding flow ends in a real account and a real checkout.
 *
 * Open since 2026-09-16. Before that the flow was walkable end to end for
 * review while the two steps that touch the outside world were held shut: no
 * account was created at the email step and Paddle was never opened. Both are
 * live now: the email step creates the account through /api/onboarding/start,
 * the plans open Paddle's inline checkout, and the code at the end verifies
 * the address through /api/onboarding/verify.
 *
 * Set back to `false` to close signups again. The marketing CTAs (signupPath)
 * return to the waiting-list campaign, the email step joins the list instead
 * of creating an account, and the sign-in page undoes any brand-new Google
 * account. Nothing else needs changing.
 *
 * Lives here rather than in app/onboarding/page.tsx because the collaboration
 * invite email and every CTA on the marketing site have to agree with it.
 */
export const SIGNUPS_OPEN: boolean = true;

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
 * Where every primary CTA on the marketing site goes: the onboarding flow.
 *
 * With signups open that is the real thing: the five slides, the quiz, the
 * verdict, the offer, the plans, a card and a code, ending in an account with
 * a trial running. With signups closed it is the same flow in its waiting-list
 * dress (`?flow=waitlist`), which captures the address at the email step and
 * ends on the secured screen instead.
 *
 * `source` is kept as `?from=` either way and recorded on the account (or the
 * waitlist row), so the console can still say which surface each person came
 * from. It is sanitised server-side; anything unknown lands as "direct".
 */
export function signupPath(source: string, language?: Language): string {
    const base = language ? localizePath('/onboarding', language) : '/onboarding';
    const from = `from=${encodeURIComponent(source)}`;
    return SIGNUPS_OPEN ? `${base}?${from}` : `${base}?flow=waitlist&${from}`;
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
 * invitation. It was held shut while SMTP_PASS was unset in CI, because the
 * mail failed silently and the flow still said "An email has been sent to …".
 *
 * Open since the condition that closed it was checked rather than assumed:
 * SMTP_PASS is present in production (the /api/health/ai fingerprint), and the
 * server accepts those credentials — nodemailer's verify() authenticates
 * against send.one.com and returns OK.
 *
 * Set back to false to stop invite mail at the source; the route refuses the
 * branch on its own, so nothing else has to change.
 */
export const COLLAB_EMAIL_INVITES_ENABLED: boolean = true;

export function inviteLandingPath(inviteId?: string): string {
    // Onboarding whether or not public signups are open. An invited person is
    // let in ahead of the list: the flow checks the invitation with the server
    // (/api/collab/invite/lookup) and, when it is good, opens the account step
    // that SIGNUPS_OPEN keeps shut for everyone else. The waiting list still
    // accepts `?invite=` for links mailed before this, and forwards them here.
    const query = inviteId ? `?from=invite&invite=${encodeURIComponent(inviteId)}` : '?from=invite';
    return `/onboarding${query}`;
}
