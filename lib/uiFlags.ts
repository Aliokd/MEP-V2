/**
 * Build-time UI flags, safe to import from client components.
 *
 * Distinct from lib/featureFlags.ts, which is `server-only` and reads runtime
 * kill switches out of Firestore for the AI endpoints. These are plain
 * constants: flipping one is a code change and a deploy, nothing more.
 */

/**
 * The practice sessions are being rebuilt, so the tab is locked behind a
 * "coming soon" screen and its sidebar entry is not clickable. Flip this to
 * true to bring the existing PracticeTab back — nothing else needs to change.
 */
export const PRACTICE_ENABLED: boolean = false;
