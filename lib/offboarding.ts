/**
 * Offboarding: why people leave, asked the same way whether they cancel a
 * subscription or delete the account.
 *
 * No firebase imports, so the settings page, the API routes and the admin
 * console all read the same list. Labels live under
 * `profile.offboarding.reason_<id>` in the locale files.
 */
export type OffboardingKind = 'cancel' | 'delete';

export const OFFBOARDING_REASONS = [
    'not_using',
    'too_expensive',
    'missing_features',
    'hard_to_use',
    'found_alternative',
    'finished',
    'other',
] as const;

export type OffboardingReason = (typeof OFFBOARDING_REASONS)[number];

/** A few sentences, not an essay: the free-text field's ceiling. */
export const OFFBOARDING_NOTE_MAX = 600;

export const isOffboardingReason = (value: unknown): value is OffboardingReason =>
    typeof value === 'string' && (OFFBOARDING_REASONS as readonly string[]).includes(value);

/** What a route accepts from the browser: known reasons only, the note trimmed and capped. */
export function sanitizeOffboardingInput(body: Record<string, unknown>): { reasons: OffboardingReason[]; note: string } {
    const raw = Array.isArray(body.reasons) ? body.reasons : [];
    const reasons = Array.from(new Set(raw.filter(isOffboardingReason)));
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, OFFBOARDING_NOTE_MAX) : '';
    return { reasons, note };
}

/** The document written to `offboarding/{id}` by the cancel and delete routes. */
export interface OffboardingRecord {
    kind: OffboardingKind;
    uid: string;
    email: string | null;
    name: string | null;
    locale: string | null;
    /** The account's tier and Paddle plan at the moment they left. */
    tier: string | null;
    plan: string | null;
    subscriptionStatus: string | null;
    /** Days between signup and leaving, when the signup date is known. */
    accountAgeDays: number | null;
    songs: number;
    reasons: OffboardingReason[];
    note: string;
    /** Whether the Paddle subscription was cancelled as part of this (null when there was none). */
    subscriptionCancelled: boolean | null;
    createdAt: string;
}
