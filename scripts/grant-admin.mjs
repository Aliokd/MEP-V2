#!/usr/bin/env node
/**
 * Bootstraps (or revokes) admin access. This is the only way to create the first
 * superadmin — after that, roles can be granted from the console itself.
 *
 *   node scripts/grant-admin.mjs <email> <role>     # grant: superadmin|moderator|editor|support
 *   node scripts/grant-admin.mjs <email> revoke     # revoke all admin access
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS to point at a service account key with
 * Firebase Auth Admin + Firestore access.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const VALID_ROLES = ["superadmin", "moderator", "editor", "support"];

const [email, role] = process.argv.slice(2);

if (!email || !role) {
    console.error("Usage: node scripts/grant-admin.mjs <email> <superadmin|moderator|editor|support|revoke>");
    process.exit(1);
}

if (role !== "revoke" && !VALID_ROLES.includes(role)) {
    console.error(`Invalid role "${role}". Expected one of: ${VALID_ROLES.join(", ")}, revoke`);
    process.exit(1);
}

if (getApps().length === 0) {
    initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || "mep-v2",
    });
}

const auth = getAuth();
const db = getFirestore();

const user = await auth.getUserByEmail(email).catch(() => null);
if (!user) {
    console.error(`No Firebase Auth user found for ${email}. They must sign in to Veinote at least once first.`);
    process.exit(1);
}

const claims = { ...(user.customClaims || {}) };

if (role === "revoke") {
    delete claims.admin;
    delete claims.adminRole;
    await auth.setCustomUserClaims(user.uid, claims);
    await db.collection("admins").doc(user.uid).delete();
    await auth.revokeRefreshTokens(user.uid);
    console.log(`Revoked admin access for ${email} (${user.uid}).`);
} else {
    claims.admin = true;
    claims.adminRole = role;
    await auth.setCustomUserClaims(user.uid, claims);
    await db.collection("admins").doc(user.uid).set(
        {
            uid: user.uid,
            email: user.email || email,
            name: user.displayName || email,
            role,
            disabled: false,
            grantedAt: FieldValue.serverTimestamp(),
            grantedBy: "cli",
        },
        { merge: true },
    );
    await db.collection("admin_audit_log").add({
        actorUid: "cli",
        actorEmail: "cli",
        actorRole: "superadmin",
        action: "role.grant",
        targetType: "admin",
        targetId: user.uid,
        targetLabel: user.email || email,
        after: { role },
        createdAt: FieldValue.serverTimestamp(),
    });
    await auth.revokeRefreshTokens(user.uid);
    console.log(`Granted "${role}" to ${email} (${user.uid}). They must sign out and back in for the claim to apply.`);
}

process.exit(0);
