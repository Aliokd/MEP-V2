// Shared role/permission vocabulary for the Veinote admin console.
// Safe to import from both server routes and client components — no firebase imports here.

export type AdminRole = "superadmin" | "moderator" | "editor" | "support";

export const ADMIN_ROLES: AdminRole[] = ["superadmin", "moderator", "editor", "support"];

export const ROLE_LABELS: Record<AdminRole, string> = {
    superadmin: "Superadmin",
    moderator: "Moderator",
    editor: "Content editor",
    support: "Support",
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
    superadmin: "Full access, including granting roles and destructive user actions.",
    moderator: "Community feed, reports and user sanctions.",
    editor: "Learn content, Bank of Ideas, Practice songs and announcements.",
    support: "Feedback inbox, support tickets and read-only user lookup.",
};

/**
 * Every distinct thing an admin can do. Keep these fine-grained — API routes and
 * UI both gate on them, so a new capability should mean a new permission rather
 * than a role check sprinkled inline.
 */
export type AdminPermission =
    // Overview
    | "overview.read"
    // Inbox (feedback + support)
    | "inbox.read"
    | "inbox.write"
    | "inbox.reply"
    // Community moderation
    | "community.read"
    | "community.moderate"
    | "reports.read"
    | "reports.resolve"
    // Users
    | "users.read"
    | "users.create"
    | "users.write"
    | "users.sanction"
    | "users.delete"
    | "users.impersonate"
    // Content
    | "content.read"
    | "content.write"
    | "content.publish"
    // Announcements & broadcast
    | "announcements.read"
    | "announcements.write"
    | "announcements.send"
    // Analytics & billing
    | "analytics.read"
    | "billing.read"
    // Pre-launch waitlist
    | "waitlist.read"
    // Ops
    | "ops.read"
    | "ops.write"
    // Governance
    | "audit.read"
    | "roles.write";

const SUPPORT_PERMISSIONS: AdminPermission[] = [
    "overview.read",
    "inbox.read",
    "inbox.write",
    "inbox.reply",
    "users.read",
    "reports.read",
    "community.read",
    "content.read",
    "announcements.read",
    "waitlist.read",
];

const MODERATOR_PERMISSIONS: AdminPermission[] = [
    ...SUPPORT_PERMISSIONS,
    "community.moderate",
    "reports.resolve",
    "users.sanction",
    "audit.read",
];

const EDITOR_PERMISSIONS: AdminPermission[] = [
    "overview.read",
    "content.read",
    "content.write",
    "content.publish",
    "announcements.read",
    "announcements.write",
    "analytics.read",
    "community.read",
    "users.read",
    "waitlist.read",
];

const ALL_PERMISSIONS: AdminPermission[] = [
    "overview.read",
    "inbox.read",
    "inbox.write",
    "inbox.reply",
    "community.read",
    "community.moderate",
    "reports.read",
    "reports.resolve",
    "users.read",
    // Creating an account sets someone's initial password, so it sits with the
    // superadmin rather than with support.
    "users.create",
    "users.write",
    "users.sanction",
    "users.delete",
    "users.impersonate",
    "content.read",
    "content.write",
    "content.publish",
    "announcements.read",
    "announcements.write",
    "announcements.send",
    "analytics.read",
    "billing.read",
    "waitlist.read",
    "ops.read",
    "ops.write",
    "audit.read",
    "roles.write",
];

export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
    superadmin: ALL_PERMISSIONS,
    moderator: MODERATOR_PERMISSIONS,
    editor: EDITOR_PERMISSIONS,
    support: SUPPORT_PERMISSIONS,
};

export function roleHasPermission(role: AdminRole | null | undefined, permission: AdminPermission): boolean {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isAdminRole(value: unknown): value is AdminRole {
    return typeof value === "string" && (ADMIN_ROLES as string[]).includes(value);
}
