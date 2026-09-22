/**
 * Gives every account already on lifetime access the golden ticket that
 * stands for it.
 *
 * The console issues one with each new grant (lib/goldenGrants.ts), but the
 * accounts granted lifetime before the program existed hold nothing, so the
 * wall at /golden shows an empty hundred while twenty people are in. This
 * mints their tickets: numbered in the order the accounts were created,
 * already redeemed in their name, and on the wall, where a redeemed ticket
 * is drawn dimmed and stamped taken.
 *
 *   node scripts/backfill-golden-tickets.mjs             # dry run, lists what it would do
 *   node scripts/backfill-golden-tickets.mjs --apply     # writes
 *   node scripts/backfill-golden-tickets.mjs --apply --unlisted   # writes, off the wall
 *
 * Safe to run twice: an account that already points at a live ticket is left
 * alone, and a ticket already redeemed by an account is adopted rather than
 * duplicated. The wall's hundred slots are the ceiling; if they run out the
 * rest are reported and nothing is forced.
 */
import { readFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
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
const listed = !process.argv.includes("--unlisted");

// Keep in step with lib/uiFlags.ts and lib/goldenTickets.ts.
const TOTAL = 100;
const INVITES = 5;
const COLLECTION = "golden_tickets";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCode() {
    const bytes = randomBytes(8);
    let out = "";
    for (let i = 0; i < 8; i++) {
        out += ALPHABET[bytes[i] % ALPHABET.length];
        if (i === 3) out += "-";
    }
    return `GOLD-${out}`;
}

function slugify(name) {
    return name
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
}

if (!getApps().length) {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    initializeApp({
        credential: keyPath && existsSync(keyPath) ? cert(JSON.parse(readFileSync(keyPath, "utf8"))) : applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "mep-v2",
    });
}

const db = getFirestore();

const [usersSnap, ticketsSnap] = await Promise.all([
    db.collection("users").where("tier", "==", "comp").get(),
    db.collection(COLLECTION).get(),
]);

const tickets = ticketsSnap.docs.map((d) => ({ slug: d.id, ...d.data() }));
const takenNumbers = new Set(tickets.map((t) => t.number).filter((n) => typeof n === "number"));
const takenSlugs = new Set(tickets.map((t) => t.slug));
const byHolder = new Map(tickets.filter((t) => t.redeemedBy?.uid).map((t) => [t.redeemedBy.uid, t]));

function nextNumber() {
    for (let n = 1; n <= TOTAL; n++) if (!takenNumbers.has(n)) return n;
    return null;
}

function freeSlug(name) {
    const base = slugify(name) || "songwriter";
    if (!takenSlugs.has(base)) return base;
    for (let i = 2; i < 100; i++) {
        const candidate = `${base}-${i}`;
        if (!takenSlugs.has(candidate)) return candidate;
    }
    return `${base}-${randomBytes(3).toString("hex")}`;
}

// Oldest account first, so the numbers follow the order people joined.
const users = usersSnap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")));

const plan = [];
for (const u of users) {
    const name = String(u.name || "").trim() || String(u.email || "").split("@")[0] || "Songwriter";
    const held = typeof u.golden?.ticket === "string" ? u.golden.ticket : null;

    if (held && takenSlugs.has(held)) {
        plan.push({ uid: u.uid, email: u.email ?? "", action: "keep", detail: held });
        continue;
    }

    const already = byHolder.get(u.uid);
    if (already) {
        plan.push({ uid: u.uid, email: u.email ?? "", action: "link", detail: already.slug, ticket: already });
        continue;
    }

    const number = nextNumber();
    if (number === null) {
        plan.push({ uid: u.uid, email: u.email ?? "", action: "no-room", detail: "the wall is full" });
        continue;
    }
    const slug = freeSlug(name);
    takenNumbers.add(number);
    takenSlugs.add(slug);
    plan.push({ uid: u.uid, email: u.email ?? "", action: "mint", detail: `${number} ${slug}`, number, slug, name });
}

const width = Math.max(...plan.map((p) => p.email.length), 5);
for (const p of plan) {
    const verb = p.action === "mint" ? (apply ? "MINT " : "would") : p.action === "link" ? "link " : p.action === "keep" ? "keep " : "SKIP ";
    console.log(`${verb} ${p.email.padEnd(width)}  ${p.detail}`);
}

const minting = plan.filter((p) => p.action === "mint");
const linking = plan.filter((p) => p.action === "link");
const full = plan.filter((p) => p.action === "no-room");

console.log(
    `\n${users.length} lifetime accounts: ${minting.length} to mint, ${linking.length} to link, ` +
        `${plan.length - minting.length - linking.length - full.length} already set${full.length ? `, ${full.length} with no room on the wall` : ""}.`,
);
if (full.length) console.log("The wall holds 100 tickets. Raise GOLDEN_TICKETS_TOTAL or free some slots.");

if (!apply) {
    console.log("\nDry run. Nothing was written. Re-run with --apply.");
    process.exit(0);
}

const now = new Date().toISOString();
let written = 0;

for (const p of minting) {
    const batch = db.batch();
    batch.set(db.collection(COLLECTION).doc(p.slug), {
        number: p.number,
        name: p.name,
        tagline: null,
        note: null,
        photoUrl: null,
        email: p.email || null,
        code: newCode(),
        status: "redeemed",
        claim: null,
        redeemedBy: { uid: p.uid, at: now, email: p.email || null },
        invites: INVITES,
        listed,
        origin: "grant",
        createdAt: now,
        updatedAt: now,
        createdBy: "backfill-golden-tickets",
    });
    batch.set(
        db.collection("users").doc(p.uid),
        { golden: { ticket: p.slug, redeemedAt: now, invites: INVITES } },
        { merge: true },
    );
    await batch.commit();
    written += 1;
}

for (const p of linking) {
    await db.collection("users").doc(p.uid).set(
        { golden: { ticket: p.detail, redeemedAt: p.ticket.redeemedBy?.at || now, invites: p.ticket.invites ?? INVITES } },
        { merge: true },
    );
    written += 1;
}

if (written) {
    await db.collection("admin_audit_log").add({
        actorUid: "script",
        actorEmail: "backfill-golden-tickets",
        actorRole: "superadmin",
        action: "golden.backfill",
        targetType: "golden_ticket",
        targetId: "batch",
        targetLabel: `${minting.length} minted, ${linking.length} linked`,
        after: { listed, minted: minting.map((p) => p.slug), linked: linking.map((p) => p.detail) },
        createdAt: FieldValue.serverTimestamp(),
    });
}

console.log(`\nDone. ${minting.length} minted, ${linking.length} linked.`);
console.log(listed ? "They are on the wall at /golden, drawn as taken." : "They are off the wall; show them from the Golden program console.");
