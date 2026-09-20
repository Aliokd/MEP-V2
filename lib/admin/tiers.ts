/**
 * The tier vocabulary the console speaks, in one place.
 *
 * Stored values are older than the names: 'pro' is the Veinote plan and
 * 'max' is Veinote Pro, because Paddle price ids, the webhook and every
 * user document are wired to them. 'comp' is the lifetime Pro grant of the
 * golden program. 'free' is what the webhook writes once a subscription has
 * lapsed; nobody chooses it, so it is not offered, but it has a name so the
 * console can show it.
 *
 * No imports: read by server routes and client pages alike.
 */
export type StoredTier = "trial" | "pro" | "max" | "comp" | "free";

export const TIER_OPTIONS: { value: StoredTier; label: string; hint: string }[] = [
    { value: "trial", label: "Trial", hint: "Full access until the trial end date" },
    { value: "pro", label: "Veinote", hint: "The standard plan, granted without billing" },
    { value: "max", label: "Veinote Pro", hint: "Rooms and Business, granted without billing" },
    { value: "comp", label: "Lifetime Pro", hint: "The golden program: Pro for good, no card" },
];

/** Values the console may write. 'free' is the webhook's alone. */
export const ASSIGNABLE_TIERS: StoredTier[] = TIER_OPTIONS.map((o) => o.value);

export const TIER_LABELS: Record<string, string> = {
    trial: "Trial",
    pro: "Veinote",
    max: "Veinote Pro",
    comp: "Lifetime Pro",
    free: "Expired",
};

export function tierLabel(tier: string | null | undefined): string {
    if (!tier) return "No tier";
    return TIER_LABELS[tier] ?? tier;
}

/** The console's badge colour per tier. */
export const TIER_TONE: Record<string, "gold" | "green" | "blue" | "neutral" | "red"> = {
    trial: "gold",
    pro: "green",
    max: "green",
    comp: "blue",
    free: "red",
};

/** The Paddle subscription statuses, in the console's words. */
export const STATUS_LABELS: Record<string, string> = {
    active: "Active",
    trialing: "Paddle trial",
    past_due: "Payment failed",
    paused: "Paused",
    canceled: "Cancelled",
};

export function statusLabel(status: string | null | undefined): string | null {
    if (!status) return null;
    return STATUS_LABELS[status] ?? status;
}
