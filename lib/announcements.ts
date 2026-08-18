import type { LocalizedText, Locale } from "@/lib/content";

/**
 * In-app announcements: the banners composed in the admin console.
 *
 * Pure logic — no React, no Firebase — so the same audience rules can be read in
 * one place instead of being re-derived at the call site.
 */

export type AnnouncementKind = "banner" | "changelog" | "maintenance";

export interface Announcement {
    id: string;
    title: LocalizedText;
    body?: LocalizedText;
    kind: AnnouncementKind;
    /** Empty or missing lists mean "everyone" — not "nobody". */
    audience?: { tiers?: string[]; locales?: string[] };
    ctaLabel?: string | null;
    ctaHref?: string | null;
    status?: string;
    /** ISO dates. Either bound may be absent, which means "no bound". */
    publishAt?: string | null;
    expiresAt?: string | null;
}

/** Parses an ISO date, returning null rather than NaN for anything unusable. */
function parseIso(value: string | null | undefined): number | null {
    if (!value) return null;
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
}

/**
 * Whether an announcement is inside its schedule window.
 *
 * An unparseable date is treated as an absent bound. The alternative — hiding
 * the announcement — would mean one malformed field silently swallows a
 * maintenance notice, which is the message that matters most.
 */
export function isWithinSchedule(announcement: Announcement, nowMs: number): boolean {
    const start = parseIso(announcement.publishAt);
    const end = parseIso(announcement.expiresAt);
    if (start !== null && nowMs < start) return false;
    if (end !== null && nowMs >= end) return false;
    return true;
}

/** Whether this reader is in the announcement's audience. */
export function matchesAudience(
    announcement: Announcement,
    reader: { tier: string | null; locale: Locale },
): boolean {
    const tiers = announcement.audience?.tiers || [];
    const locales = announcement.audience?.locales || [];

    // A tier filter with no tier on the account excludes the reader: "pro" means
    // pro, and a free account is not one.
    if (tiers.length > 0 && (!reader.tier || !tiers.includes(reader.tier))) return false;
    if (locales.length > 0 && !locales.includes(reader.locale)) return false;
    return true;
}

export function visibleAnnouncements(
    announcements: Announcement[],
    reader: { tier: string | null; locale: Locale },
    dismissedIds: Set<string>,
    nowMs: number,
): Announcement[] {
    return announcements.filter(
        (a) =>
            a.status === "published" &&
            !dismissedIds.has(a.id) &&
            isWithinSchedule(a, nowMs) &&
            matchesAudience(a, reader),
    );
}

/**
 * Dismissals are per account, not per browser: two people sharing a laptop must
 * not inherit each other's dismissed banners.
 */
export function dismissedKey(uid: string): string {
    return `veinote-announcements-dismissed-${uid}`;
}

export function readDismissed(raw: string | null): Set<string> {
    if (!raw) return new Set();
    try {
        const parsed = JSON.parse(raw);
        return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : []);
    } catch {
        return new Set();
    }
}
