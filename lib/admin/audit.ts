import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import type { AdminRole } from "./roles";

/**
 * Append-only record of everything an admin does. Firestore rules deny all client
 * writes to `admin_audit_log` — entries only ever come from server routes via
 * writeAudit(), and nothing (including a superadmin) may update or delete them.
 */
export interface AuditEntryInput {
    actorUid: string;
    actorEmail: string;
    actorRole: AdminRole;
    /** Dot-namespaced verb, e.g. "post.hide", "user.suspend", "lesson.publish". */
    action: string;
    /** What was acted on: "post" | "comment" | "user" | "feedback" | "lesson" | ... */
    targetType: string;
    targetId: string;
    /** Human-readable label so the log stays readable after the target is deleted. */
    targetLabel?: string;
    /** Reason shown to the affected user where applicable (statement of reasons). */
    reason?: string;
    /** Field-level before/after for edits. Keep small — this is a log, not a backup. */
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
}

export async function writeAudit(entry: AuditEntryInput): Promise<void> {
    try {
        await adminDb.collection("admin_audit_log").add({
            ...entry,
            createdAt: FieldValue.serverTimestamp(),
        });
    } catch (err) {
        // Never let a logging failure break the action the admin actually took —
        // but make it loud, since a silent audit gap is the failure mode that matters.
        console.error("[audit] Failed to write audit entry", entry.action, err);
    }
}

/** Pulls the request metadata worth keeping on an audit entry. */
export function auditContext(request: Request): { ip?: string; userAgent?: string } {
    const forwarded = request.headers.get("x-forwarded-for");
    return {
        ip: forwarded ? forwarded.split(",")[0].trim() : undefined,
        userAgent: request.headers.get("user-agent") || undefined,
    };
}
