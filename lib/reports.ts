/**
 * Report vocabulary, shared by the user-facing report dialog, the API route and
 * the moderation queue. No firebase imports — safe on both sides.
 */

export type ReportReason =
    | "spam"
    | "harassment"
    | "hate"
    | "sexual"
    | "self_harm"
    | "violence"
    | "copyright"
    | "impersonation"
    | "other";

export type ReportTargetType = "post" | "comment" | "song" | "profile";

export const REPORT_REASONS: ReportReason[] = [
    "spam",
    "harassment",
    "hate",
    "sexual",
    "self_harm",
    "violence",
    "copyright",
    "impersonation",
    "other",
];

/** Locale key suffixes; the copy itself lives in locales/*.json under `report.reason_*`. */
export const REASON_LABELS: Record<ReportReason, string> = {
    spam: "Spam or scam",
    harassment: "Harassment or bullying",
    hate: "Hate speech",
    sexual: "Sexual content",
    self_harm: "Self-harm or suicide",
    violence: "Violence or threats",
    copyright: "Copyright: this is someone else's work",
    impersonation: "Impersonation",
    other: "Something else",
};

export type ReportPriority = "normal" | "high" | "urgent";

/**
 * Anything where a real person may be in danger jumps the queue. Everything else
 * is triaged by how much harm a slow response causes.
 */
export function priorityForReason(reason: ReportReason): ReportPriority {
    switch (reason) {
        case "self_harm":
        case "violence":
            return "urgent";
        case "hate":
        case "harassment":
        case "copyright":
        case "impersonation":
            return "high";
        default:
            return "normal";
    }
}

const PRIORITY_RANK: Record<ReportPriority, number> = { normal: 0, high: 1, urgent: 2 };

export function highestPriority(a: ReportPriority, b: ReportPriority): ReportPriority {
    return PRIORITY_RANK[a] >= PRIORITY_RANK[b] ? a : b;
}

/** Stable id for the aggregate doc that groups every report about one thing. */
export function targetKey(targetType: ReportTargetType, targetId: string): string {
    return `${targetType}_${targetId}`;
}

export function isReportReason(value: unknown): value is ReportReason {
    return typeof value === "string" && (REPORT_REASONS as string[]).includes(value);
}

export function isReportTargetType(value: unknown): value is ReportTargetType {
    return value === "post" || value === "comment" || value === "song" || value === "profile";
}
