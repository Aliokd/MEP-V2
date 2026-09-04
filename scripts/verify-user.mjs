#!/usr/bin/env node
/**
 * Marks a songwriter verified (or removes the mark) from the command line.
 *
 *   node scripts/verify-user.mjs <uid-or-exact-name>            # verify
 *   node scripts/verify-user.mjs <uid-or-exact-name> --revoke   # remove the mark
 *
 * The normal path is the admin console (/admin/verification), which reviews a
 * request the songwriter filed. This is the bypass for seeding — the first few
 * verified accounts, before anyone has filed a request — and for repairs.
 *
 * Writes `publicProfiles/{uid}.verified` through the Admin SDK. That field is
 * deliberately not client-writable (see the publicProfiles rule), so this and
 * the console API are the only two writers.
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS to point at a service account key.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const [target, flag] = process.argv.slice(2);
const revoke = flag === "--revoke";

if (!target) {
    console.error("Usage: node scripts/verify-user.mjs <uid-or-exact-name> [--revoke]");
    process.exit(1);
}

if (getApps().length === 0) {
    initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || "mep-v2",
    });
}

const db = getFirestore();
const profiles = db.collection("publicProfiles");

// A uid is tried first; failing that, the exact display name. Names are not
// unique, so an ambiguous match is refused rather than guessed at.
let uid = null;
const byId = await profiles.doc(target).get();
if (byId.exists) {
    uid = byId.id;
} else {
    const byName = await profiles.where("name", "==", target).get();
    if (byName.size === 1) {
        uid = byName.docs[0].id;
    } else if (byName.size > 1) {
        console.error(`"${target}" matches ${byName.size} profiles — pass the uid instead:`);
        for (const d of byName.docs) console.error(`  ${d.id}`);
        process.exit(1);
    }
}

if (!uid) {
    console.error(`No public profile found for "${target}" (tried as uid, then as exact name).`);
    process.exit(1);
}

await profiles.doc(uid).set(
    {
        verified: !revoke,
        verifiedAt: revoke ? FieldValue.delete() : Date.now(),
    },
    { merge: true },
);

console.log(`${revoke ? "Removed verified mark from" : "Verified"} ${target} (${uid}).`);
