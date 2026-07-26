import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { syncAdminClaim, withAdmin } from "@/lib/admin/auth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { isAdminRole } from "@/lib/admin/roles";

export const dynamic = "force-dynamic";

export const GET = withAdmin("roles.write", async () => {
    const snap = await adminDb.collection("admins").get();
    return NextResponse.json({
        admins: snap.docs.map((doc) => {
            const d = doc.data();
            return {
                uid: doc.id,
                email: d.email || null,
                name: d.name || null,
                role: d.role,
                disabled: d.disabled === true,
                grantedBy: d.grantedBy || null,
                grantedAt: d.grantedAt?.toMillis?.() ?? null,
            };
        }),
    });
});

/**
 * Grants or changes an admin role.
 *
 * The `admins/{uid}` doc is authoritative; the custom claim is a mirror so
 * Firestore rules can check a role without a document read. Both are written
 * here, and refresh tokens are revoked so the change takes effect immediately
 * rather than whenever the target's hour-long ID token happens to expire.
 */
export const POST = withAdmin("roles.write", async (request, admin) => {
    const { email, role } = await request.json();

    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!isAdminRole(role)) return NextResponse.json({ error: `Invalid role "${role}"` }, { status: 400 });

    const user = await adminAuth.getUserByEmail(email).catch(() => null);
    if (!user) {
        return NextResponse.json(
            { error: `No Veinote account for ${email}. They must sign in once before a role can be granted.` },
            { status: 404 },
        );
    }

    const existing = await adminDb.collection("admins").doc(user.uid).get();

    await adminDb.collection("admins").doc(user.uid).set(
        {
            uid: user.uid,
            email: user.email || email,
            name: user.displayName || email,
            role,
            disabled: false,
            grantedBy: admin.email,
            grantedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
    );

    await syncAdminClaim(user.uid, role);

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: existing.exists ? "role.change" : "role.grant",
        targetType: "admin",
        targetId: user.uid,
        targetLabel: user.email || email,
        before: { role: existing.data()?.role || null },
        after: { role },
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, uid: user.uid });
});

export const DELETE = withAdmin("roles.write", async (request, admin) => {
    const url = new URL(request.url);
    const uid = url.searchParams.get("uid");
    if (!uid) return NextResponse.json({ error: "uid is required" }, { status: 400 });

    // Losing the last superadmin would lock everyone out of role management,
    // and the only way back would be the CLI script.
    if (uid === admin.uid) {
        return NextResponse.json({ error: "You cannot revoke your own admin access" }, { status: 400 });
    }

    const snap = await adminDb.collection("admins").doc(uid).get();
    if (!snap.exists) return NextResponse.json({ error: "Not an admin" }, { status: 404 });

    if (snap.data()?.role === "superadmin") {
        const superadmins = await adminDb.collection("admins").where("role", "==", "superadmin").count().get();
        if (superadmins.data().count <= 1) {
            return NextResponse.json({ error: "This is the last superadmin — grant another first" }, { status: 400 });
        }
    }

    await adminDb.collection("admins").doc(uid).delete();
    await syncAdminClaim(uid, null);

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "role.revoke",
        targetType: "admin",
        targetId: uid,
        targetLabel: snap.data()?.email || uid,
        before: { role: snap.data()?.role },
        after: { role: null },
        ...auditContext(request),
    });

    return NextResponse.json({ success: true });
});
