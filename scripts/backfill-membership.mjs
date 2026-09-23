/**
 * Writes `member` / `memberUntil` onto every public profile, from the
 * account's access (lib/membership.ts, which this mirrors in plain JS).
 *
 * Connect lists members only. Profiles written before the flag existed
 * have none and would drop out of the roster, so run this whenever the
 * rule changes, and once after the deploy that introduces it.
 *
 *   node scripts/backfill-membership.mjs           # dry run: who is listed, who is not, and why
 *   node scripts/backfill-membership.mjs --apply   # writes
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
if (!getApps().length) {
    const k = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    initializeApp({
        credential: k && existsSync(k) ? cert(JSON.parse(readFileSync(k, "utf8"))) : applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    });
}

const ENTITLED = new Set(["active", "trialing", "past_due"]);
/** Same answer as lib/membership.ts membershipOf(), kept in step by hand. */
function membershipOf(u, now = Date.now()) {
    if (!u) return { member: false, memberUntil: null, why: "no account" };
    const b = u.billing ?? {};
    if (u.signup?.method === "onboarding" && !u.signup?.verifiedAt) return { member: false, memberUntil: null, why: "signup not finished" };
    const plan = b.plan === "pro" || b.plan === "max" ? b.plan : null;
    if (plan && ENTITLED.has(b.subscriptionStatus)) return { member: true, memberUntil: null, why: `paid ${b.subscriptionStatus}` };
    const tier = u.tier ?? null;
    if (tier === "comp" || tier === "max" || tier === "pro") return { member: true, memberUntil: null, why: `granted ${tier}` };
    if (tier === "free") return { member: false, memberUntil: null, why: "subscription lapsed" };
    const ends = Date.parse(b.trialEndsAt ?? "");
    if (Number.isNaN(ends)) return { member: false, memberUntil: null, why: "no trial started" };
    if (ends > now) return { member: true, memberUntil: b.trialEndsAt, why: "console trial" };
    return { member: false, memberUntil: null, why: "trial ended" };
}

const db = getFirestore();
const profiles = await db.collection("publicProfiles").get();
let listed = 0, hidden = 0, changed = 0;
const batch = db.batch();
for (const p of profiles.docs) {
    const u = (await db.doc(`users/${p.id}`).get()).data();
    const m = membershipOf(u);
    const cur = p.data();
    const differs = cur.member !== m.member || (cur.memberUntil ?? null) !== m.memberUntil;
    const who = (u?.email || p.data().name || p.id).replace(/^(..).*@/, "$1…@");
    if (m.member) listed++; else hidden++;
    if (!m.member || differs) console.log(`${m.member ? "list " : "HIDE "} ${who.padEnd(30)} ${m.why}${differs ? "" : " (unchanged)"}`);
    if (differs) { changed++; if (apply) batch.set(p.ref, { member: m.member, memberUntil: m.memberUntil }, { merge: true }); }
}
if (apply && changed) await batch.commit();
console.log(`\n${profiles.size} profiles: ${listed} listed, ${hidden} hidden; ${changed} ${apply ? "written" : "would be written"}${apply ? "" : ". Re-run with --apply to write."}`);
