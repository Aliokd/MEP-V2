/**
 * Stamps a trial end date on accounts that have none.
 *
 * Before 2026-09-20 an account was born with `billing.trialEndsAt: null`
 * and nothing ever read it, so a trial never ended. Now the platform gates
 * on the date. An account still without one is treated as on its trial
 * until the plan hook stamps it (3 days from that person's next visit),
 * which is abrupt for people who have been writing for weeks. This gives
 * every such account a chosen number of days from now instead, in one go,
 * so nobody is surprised on launch day.
 *
 *   node scripts/backfill-trial-dates.mjs            # dry run, lists who would change
 *   node scripts/backfill-trial-dates.mjs --apply 14 # 14 days from now, written
 *
 * Only accounts on tier "trial" with no Paddle subscription and no date are
 * touched. Reads credentials the way the other scripts here do: from
 * .env.local (GOOGLE_APPLICATION_CREDENTIALS or the Admin SDK's default).
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
}

const apply = process.argv.includes("--apply");
const daysArg = Number(process.argv[process.argv.indexOf("--apply") + 1]);
const days = apply && Number.isFinite(daysArg) && daysArg > 0 ? daysArg : 14;

if (!getApps().length) {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    initializeApp({
        credential: keyPath && existsSync(keyPath) ? cert(JSON.parse(readFileSync(keyPath, "utf8"))) : applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    });
}

const db = getFirestore();
const snap = await db.collection("users").get();
const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

let candidates = 0;
let batch = db.batch();
let inBatch = 0;
for (const doc of snap.docs) {
    const d = doc.data();
    const tier = d.tier ?? "trial";
    const billing = d.billing ?? {};
    if (tier !== "trial") continue;
    if (billing.paddleSubscriptionId) continue;
    if (typeof billing.trialEndsAt === "string" && billing.trialEndsAt) continue;
    candidates += 1;
    console.log(`${apply ? "stamp" : "would stamp"}  ${doc.id}  ${d.email ?? ""}  created ${d.createdAt ?? "?"}`);
    if (apply) {
        batch.set(doc.ref, { billing: { trialEndsAt: until } }, { merge: true });
        inBatch += 1;
        if (inBatch === 400) { await batch.commit(); batch = db.batch(); inBatch = 0; }
    }
}
if (apply && inBatch > 0) await batch.commit();

console.log(`\n${candidates} account(s) ${apply ? `stamped to end ${until}` : "would be stamped"}${apply ? "" : ". Re-run with --apply <days> to write."}`);
