#!/usr/bin/env node
/**
 * Seeds publicProfiles/{uid} from the existing users/{uid} documents.
 *
 * publicProfiles carries the handful of fields that are genuinely public — name,
 * avatar, songwriter type, activity stamps — so that users/{uid}, which also
 * holds the account's email address and its billing record, can stop being
 * readable by every signed-in user. New accounts write both from signup; this
 * script covers everyone who registered before that existed.
 *
 * RUN THIS BEFORE DEPLOYING THE RULES CHANGE. Until the mirror is populated,
 * collaborator names and the Connect roster read an empty collection: nothing
 * breaks, but people show as "Collaborator" and the roster looks empty.
 *
 *   node scripts/backfill-public-profiles.mjs --dry-run   # report only, write nothing
 *   node scripts/backfill-public-profiles.mjs             # write the mirror
 *
 * Idempotent — safe to re-run, and safe to run again after the deploy to pick up
 * anyone created in between. Requires GOOGLE_APPLICATION_CREDENTIALS to point at
 * a service account key with Firestore access.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const dryRun = process.argv.includes("--dry-run");

if (getApps().length === 0) {
    initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

// Firestore caps a batch at 500 writes.
const BATCH_LIMIT = 400;

function publicFieldsOf(data) {
    return {
        uid: data.uid || null,
        name: (data.name || "").trim(),
        photoURL: data.photoURL || null,
        // Flattened out of the onboarding answers, which stay private.
        songwriterType: data.answers?.songwriter_type ?? null,
        createdAt: data.createdAt || null,
        lastActiveAt: data.lastActiveAt || data.createdAt || null,
    };
}

async function main() {
    console.log(dryRun ? "Dry run — nothing will be written.\n" : "Backfilling publicProfiles…\n");

    const snap = await db.collection("users").get();
    console.log(`Found ${snap.size} user document(s).`);

    let written = 0;
    let skipped = 0;
    let batch = db.batch();
    let pending = 0;

    for (const docSnap of snap.docs) {
        const data = docSnap.data() || {};
        const fields = publicFieldsOf(data);
        fields.uid = fields.uid || docSnap.id;

        // An account that never finished signup has no name, so it would not be
        // shown anywhere anyway. Mirroring it would only publish an empty card.
        if (!fields.name) {
            skipped++;
            continue;
        }

        if (!dryRun) {
            batch.set(db.collection("publicProfiles").doc(docSnap.id), fields, { merge: true });
            pending++;

            if (pending >= BATCH_LIMIT) {
                await batch.commit();
                batch = db.batch();
                pending = 0;
            }
        }

        written++;
    }

    if (!dryRun && pending > 0) {
        await batch.commit();
    }

    console.log(`\n${dryRun ? "Would mirror" : "Mirrored"}: ${written}`);
    console.log(`Skipped (no name on the account): ${skipped}`);

    if (dryRun) console.log("\nRe-run without --dry-run to write.");
}

main().catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
});
