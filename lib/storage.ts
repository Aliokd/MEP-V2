/**
 * Safe wrapper for localStorage.setItem that catches QuotaExceededError
 * and prevents client-side React crashes on browsers with restricted or full storage.
 */
export function safeLocalStorageSetItem(key: string, value: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (err) {
        console.warn(`[Storage] Failed to setItem for key "${key}":`, err);
        try {
            // Attempt cleanup of non-critical temporary cached keys
            const keysToRemove = ['mep-connect-posts-v4', 'mep_mock_remote_users', 'mep_mock_pending_invites'];
            keysToRemove.forEach(k => {
                if (k !== key) {
                    localStorage.removeItem(k);
                }
            });
            localStorage.setItem(key, value);
            return true;
        } catch (retryErr) {
            console.warn(`[Storage] Storage full for "${key}". Continuing without caching to local storage.`);
            return false;
        }
    }
}

export function safeLocalStorageGetItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return localStorage.getItem(key);
    } catch (err) {
        console.warn(`[Storage] Failed to getItem for key "${key}":`, err);
        return null;
    }
}

/** The uid whose account-scoped local state currently occupies this browser profile. */
export const ACTIVE_UID_KEY = 'veinote-last-active-uid';

/**
 * Every localStorage key that belongs to an *account* rather than the device.
 * Progress counters, onboarding/tour flags, note caches, drafts — all of it used to be
 * written unscoped, so a second account signing in on the same browser inherited the
 * previous account's projects (they showed up under "Collab Projects", since their
 * ownerId differs), Mind Power progress, and an already-dismissed welcome video + tours.
 *
 * Device-level preferences (sidebar collapse, language) are deliberately NOT listed.
 */
const ACCOUNT_SCOPED_KEYS = [
    // Legacy unscoped note/workspace caches
    'veinote-create-notes',
    'veinote-create-folders',
    'veinote-selected-note-id',
    // Mind Power progress inputs
    'mep-create-seconds',
    'mep-create-words-typed',
    'mep-create-recording-seconds',
    'mep-practice-seconds',
    'mep-completed-lessons',
    'mep-completed-songs',
    'mep-completed-practices',
    'mep-community-shared-count',
    'songwriting-progress',
    'songwriting-progress-quote',
    'songwriting-progress-confetti',
    'mep-last-auto-pop-first-action-date',
    'mep-last-auto-pop-major-task-date',
    // Onboarding / first-run surfaces — a fresh account must see these again
    'mep-welcome-video-seen',
    'mep-tour-platform-seen',
    'mep-tour-create-seen',
    'mep-structure-demo-seen',
    'mep_studio_info_banner_shown',
    // Session-ish account state
    'mep-focus-timer-duration',
    'mep-focus-timer-ends-at',
    'mep-focus-timer-remaining',
    'mep-focus-timer-running',
    // Superseded by the countdown keys above; still purged so an old count-up value
    // left on a shared browser can't outlive the account that created it.
    'mep-focus-timer-seconds',
    'veinote-inspiration-answers',
    'mep-connect-posts-v4',
    // The unscoped fallback in lib/canvasTips.ts (written only when there is no
    // uid). Reads there are scoped symmetrically, so nothing currently carries
    // across accounts — this is listed so that stays true if a fallback read is
    // ever added, the way the note cache already has one.
    'veinote-pending-canvas-tip',
];

/** Prefixes for account-scoped keys with dynamic suffixes (per-project markers). */
const ACCOUNT_SCOPED_PREFIXES = ['mep-comments-read-'];

/**
 * Call on every auth resolution. Keeps this browser's account-scoped local state bound to
 * exactly one uid:
 *
 * - Same uid as last time: no-op.
 * - First uid this browser has ever seen: adopt the legacy unscoped note/folder caches into
 *   the uid-scoped keys (they can only belong to this user), then drop the unscoped copies.
 * - A DIFFERENT uid: purge all account-scoped state so the new account starts from scratch —
 *   nothing of the previous account's projects, progress, or dismissed-onboarding flags leaks.
 *   (Their uid-scoped note caches stay put; those are isolated by key already.)
 */
export function bindLocalStateToAccount(uid: string): void {
    if (typeof window === 'undefined') return;
    try {
        const previousUid = localStorage.getItem(ACTIVE_UID_KEY);
        if (previousUid === uid) return;

        if (previousUid === null) {
            // Pre-namespacing browser: the unscoped note cache MAY belong to this user — but
            // it may equally be a different account's leftovers (the exact bug this function
            // exists to stop). Notes carry ownerId, so adopt only the ones provably this
            // user's; ownerless demo/logged-out drafts and everything else stay behind
            // (real data reloads from Firestore anyway). Folders are not migrated at all —
            // the signed-in source of truth for folders is the users/{uid} doc.
            try {
                const legacyRaw = localStorage.getItem('veinote-create-notes');
                if (legacyRaw !== null && localStorage.getItem(`veinote-create-notes-${uid}`) === null) {
                    const legacyNotes = JSON.parse(legacyRaw);
                    if (Array.isArray(legacyNotes)) {
                        const ownNotes = legacyNotes.filter((n: any) => n && n.ownerId === uid);
                        if (ownNotes.length > 0) {
                            safeLocalStorageSetItem(`veinote-create-notes-${uid}`, JSON.stringify(ownNotes));
                        }
                    }
                }
            } catch { /* a corrupt legacy cache is not worth keeping */ }
        }

        ACCOUNT_SCOPED_KEYS.forEach(key => {
            try { localStorage.removeItem(key); } catch { /* ignore */ }
        });
        const dynamicKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && ACCOUNT_SCOPED_PREFIXES.some(prefix => key.startsWith(prefix))) {
                dynamicKeys.push(key);
            }
        }
        dynamicKeys.forEach(key => {
            try { localStorage.removeItem(key); } catch { /* ignore */ }
        });

        safeLocalStorageSetItem(ACTIVE_UID_KEY, uid);
    } catch (err) {
        console.warn('[Storage] Could not bind local state to account:', err);
    }
}

/**
 * Forgets which project was open, so the next visit to Create opens the workspace
 * rather than dropping straight back into a song.
 *
 * Signing in and refreshing the page are different intentions wearing the same
 * clothes. A refresh means "I'm still here" and must keep the work on screen —
 * losing it there is the bug that made this restore exist. Signing in means
 * "I'm starting", and landing mid-song in whatever was last open is disorienting,
 * especially on a shared or returning-after-weeks browser.
 *
 * Nothing distinguishes the two from inside the Create page: auth resolves from
 * null to a user on a refresh exactly as it does on a sign-in. So this is called
 * from the sign-in screen instead — the one place that only ever runs when someone
 * has actually just signed in. A refresh never reaches it.
 *
 * Both keys are cleared: the restore path falls back from the uid-scoped key to the
 * unscoped one, so leaving that behind would just reopen the same project.
 */
export function clearOpenProject(uid?: string): void {
    if (typeof window === 'undefined') return;
    try {
        if (uid) localStorage.removeItem(`veinote-selected-note-id-${uid}`);
        localStorage.removeItem('veinote-selected-note-id');
    } catch { /* a browser refusing storage is not a reason to block sign-in */ }
}
