/**
 * The explanation printed under the cookie switches on /cookies.
 *
 * It lives here rather than inside the route because two things need the same
 * words: the page renders it when no CMS document is published, and the admin's
 * "Import from code" writes it into `site_pages/cookies` as the starting draft.
 * Kept in one place so the imported page and the fallback can't drift apart.
 *
 * English only, like /terms' fallback — the localized versions are written in
 * the CMS once the page is imported, and until then every locale reads this
 * rather than nothing.
 *
 * It deliberately says nothing the panel above it already says: the categories
 * and what each one does are the panel's job, and repeating them here would
 * mean two descriptions of the same switches, drifting apart from the day the
 * page is first edited.
 */
export const COOKIES_FALLBACK_MD = `
## What these are

A cookie is a small file a site asks your browser to keep. Alongside cookies we use similar browser storage (localStorage and session storage) for the same purposes, and everything on this page applies to those too.

## Who they involve

Cookies and storage that keep Veinote working are set by us and by Firebase, which handles sign-in, hosting and file storage. These cannot be switched off while you are using the site.

Analytics is PostHog, running in the EU. Before you allow anything it runs in an anonymous mode that writes nothing to your device: visits are counted, but nothing is kept and nobody is identified. Allowing analytics is what lets it remember a device between visits.

Session recording is PostHog's replay together with Microsoft Clarity. Recordings mask all text, so your lyrics and anything else you write never appear in one.

Payments are handled by our payment partner at checkout, under its own terms.

## How long your answer lasts

Your answer is stored on this device, in this browser, and stays until you change it here or clear your browser's storage. It is not attached to your account, so signing in on another device means answering again there, and signing in never changes an answer you have already given.

## Changing your mind

Use the switches above, at any time. Turning something off stops it immediately; anything already collected under the earlier answer is handled as described in the privacy policy.

Your browser can also block or delete cookies itself, in its own settings. Blocking the strictly necessary ones will stop parts of Veinote from working, staying signed in most of all.

## Questions

Write to support@veinote.com and we will answer.
`;
