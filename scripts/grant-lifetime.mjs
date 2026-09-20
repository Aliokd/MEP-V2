/**
 * Gives every existing account that is still on a trial (or has lapsed)
 * lifetime Pro: tier "comp", the same grant the golden program makes.
 *
 * The founding accounts were in before the trial had an end date. Rather
 * than start a clock on people who have been writing for weeks, they keep
 * the product for good. Paying accounts and accounts already on a grant
 * are left alone; only "trial" and "free" tiers without a live Paddle
 * subscription change.
 *
 *   node scripts/grant-lifetime.mjs           # dry run, lists who would change
 *   node scripts/grant-lifetime.mjs --apply   # writes
 *
 * Every write is stamped (`lifetime.grantedAt`, `lifetime.reason`) and
 * recorded in admin_audit_log, so the console's audit page shows it.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
}

const apply = process.argv.includes("--apply");
const ENTITLED = new Set(["active", "trialing", "past_due"]);

if (!getApps().length) {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    initializeApp({
        credential: keyPath && existsSync(keyPath) ? cert(JSON.parse(readFileSync(keyPath, "utf8"))) : applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    });
}

const db = getFirestore();
const snap = await db.collection("users").get();
const now = new Date().toISOString();

const rows = [];
for (const doc of snap.docs) {
    const d = doc.data();
    const tier = d.tier ?? "trial";
    const billing = d.billing ?? {};
    const live = Boolean(billing.paddleSubscriptionId) && ENTITLED.has(billing.subscriptionStatus);
    const change = (tier === "trial" || tier === "free") && !live;
    rows.push({ uid: doc.id, email: d.email ?? "", tier, status: billing.subscriptionStatus ?? "", change });
}

const width = Math.max(...rows.map((r) => r.email.length), 5);
for (const r of rows) {
    console.log(`${r.change ? (apply ? "GRANT " : "would ") : "keep  "} ${r.email.padEnd(width)}  ${r.tier.padEnd(6)} ${r.status}`);
}

const toChange = rows.filter((r) => r.change);
if (apply && toChange.length) {
    const batch = db.batch();
    for (const r of toChange) {
        batch.set(db.collection("users").doc(r.uid), {
            tier: "comp",
            lifetime: { grantedAt: now, reason: "founding-account", previousTier: r.tier },
        }, { merge: true });
        batch.set(db.collection("admin_audit_log").doc(), {
            actorUid: "script",
            actorEmail: "scripts/grant-lifetime.mjs",
            actorRole: "superadmin",
            action: "user.update.tier",
            targetType: "user",
            targetId: r.uid,
            targetLabel: r.email || r.uid,
            reason: "Founding account: lifetime Pro for everyone in before launch",
            before: { tier: r.tier },
            after: { tier: "comp" },
            createdAt: FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();
}

console.log(`\n${snap.size} accounts, ${toChange.length} ${apply ? "granted lifetime Pro" : "would be granted lifetime Pro"}, ${rows.length - toChange.length} unchanged${apply ? "" : ". Re-run with --apply to write."}`);
