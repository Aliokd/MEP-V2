import "server-only";
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { isAdminRole, roleHasPermission, type AdminPermission, type AdminRole } from "./roles";

export interface AdminIdentity {
    uid: string;
    email: string;
    name: string;
    role: AdminRole;
}

export class AdminAuthError extends Error {
    constructor(
        message: string,
        readonly status: 401 | 403,
    ) {
        super(message);
        this.name = "AdminAuthError";
    }
}

/**
 * Resolves the caller's admin identity from the `Authorization: Bearer <idToken>` header.
 *
 * The client-side gate in the admin layout is UX only — this is the check that actually
 * matters, and every /api/admin/* route must run it. The `admins/{uid}` doc is the source
 * of truth for the role; the custom claim is a mirror kept for Firestore rules, so a claim
 * left stale by a role change can never grant more than the doc says.
 */
export async function getAdminIdentity(request: Request): Promise<AdminIdentity> {
    const header = request.headers.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

    if (!token) {
        throw new AdminAuthError("Missing bearer token", 401);
    }

    let decoded;
    try {
        // checkRevoked: a disabled admin's session dies on their next request.
        decoded = await adminAuth.verifyIdToken(token, true);
    } catch {
        throw new AdminAuthError("Invalid or expired token", 401);
    }

    const snap = await adminDb.collection("admins").doc(decoded.uid).get();
    if (!snap.exists) {
        throw new AdminAuthError("Not an admin", 403);
    }

    const data = snap.data() || {};
    if (data.disabled === true) {
        throw new AdminAuthError("Admin access disabled", 403);
    }
    if (!isAdminRole(data.role)) {
        throw new AdminAuthError("Admin record has no valid role", 403);
    }

    return {
        uid: decoded.uid,
        email: decoded.email || data.email || "",
        name: data.name || decoded.name || decoded.email || decoded.uid,
        role: data.role,
    };
}

/** Same as getAdminIdentity, plus a permission check. */
export async function requireAdmin(request: Request, permission: AdminPermission): Promise<AdminIdentity> {
    const identity = await getAdminIdentity(request);
    if (!roleHasPermission(identity.role, permission)) {
        throw new AdminAuthError(`Role "${identity.role}" lacks permission "${permission}"`, 403);
    }
    return identity;
}

/**
 * Wraps a route handler so auth failures become clean JSON responses.
 *
 *   export const GET = withAdmin("inbox.read", async (request, admin) => { ... });
 */
export function withAdmin<T extends unknown[]>(
    permission: AdminPermission,
    handler: (request: Request, admin: AdminIdentity, ...rest: T) => Promise<Response>,
) {
    return async (request: Request, ...rest: T): Promise<Response> => {
        let admin: AdminIdentity;
        try {
            admin = await requireAdmin(request, permission);
        } catch (err) {
            if (err instanceof AdminAuthError) {
                return NextResponse.json({ error: err.message }, { status: err.status });
            }
            console.error("[admin-auth] Unexpected failure", err);
            return NextResponse.json({ error: "Authorization failed" }, { status: 500 });
        }

        try {
            return await handler(request, admin, ...rest);
        } catch (err: any) {
            console.error(`[admin] Handler failed for ${permission}`, err);
            return NextResponse.json({ error: err?.message || "Request failed" }, { status: 500 });
        }
    };
}

/**
 * Mirrors the `admins/{uid}` role onto the user's Firebase custom claims so
 * Firestore rules can read it without a document lookup on every request.
 * Call this whenever a role is granted, changed or revoked.
 */
export async function syncAdminClaim(uid: string, role: AdminRole | null): Promise<void> {
    const user = await adminAuth.getUser(uid);
    const claims = { ...(user.customClaims || {}) };

    if (role) {
        claims.admin = true;
        claims.adminRole = role;
    } else {
        delete claims.admin;
        delete claims.adminRole;
    }

    await adminAuth.setCustomUserClaims(uid, claims);
    // Force a token refresh so a revoked admin can't ride out their current hour.
    await adminAuth.revokeRefreshTokens(uid);
}
