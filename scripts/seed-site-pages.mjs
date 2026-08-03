#!/usr/bin/env node
/**
 * Moves the copy that currently lives in locales/*.json into the Pages CMS, so
 * an admin can edit it without a deploy.
 *
 *   node scripts/seed-site-pages.mjs            # dry run — prints the markdown
 *   node scripts/seed-site-pages.mjs --commit   # writes to Firestore
 *
 * Seeds:
 *   - site_pages/privacy   from privacy.title + privacy.sections.*  (12 sections)
 *   - faqs/*               from home.faq.items                      (the /#qa accordion)
 *
 * Safe to re-run: writes are keyed on deterministic ids. An existing document's
 * status and body are NOT overwritten — once an admin has edited the policy in
 * the console, re-running this must not silently revert their wording.
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFile } from "node:fs/promises";
import path from "node:path";

const commit = process.argv.includes("--commit");
const force = process.argv.includes("--force");
const root = process.cwd();
const LOCALES = ["en", "no", "sv"];

const SECTION_IDS = [
    "introduction",
    "info_we_collect",
    "how_we_use",
    "your_content",
    "cookies_analytics",
    "third_party",
    "data_security",
    "data_retention",
    "your_rights",
    "childrens_privacy",
    "changes",
    "contact",
];

if (getApps().length === 0) {
    initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || "mep-v2",
    });
}
const db = getFirestore();

async function loadLocale(locale) {
    return JSON.parse(await readFile(path.join(root, "locales", `${locale}.json`), "utf8"));
}

const bundles = Object.fromEntries(
    await Promise.all(LOCALES.map(async (l) => [l, await loadLocale(l)])),
);

/**
 * Renders the 12 privacy sections as markdown: each section title becomes an h2
 * and its body follows. `whitespace-pre-line` in the old template means single
 * newlines were meaningful, so they're preserved as hard breaks.
 */
function privacyMarkdown(bundle) {
    return SECTION_IDS.map((id) => {
        const section = bundle.privacy?.sections?.[id];
        if (!section) return null;
        const body = String(section.body || "").split("\n").join("  \n");
        return `## ${section.title}\n\n${body}`;
    })
        .filter(Boolean)
        .join("\n\n");
}

async function seedPrivacy() {
    const title = {};
    const description = {};
    const body = {};

    for (const locale of LOCALES) {
        const bundle = bundles[locale];
        title[locale] = bundle.privacy?.title || "Privacy Policy";
        description[locale] = bundle.privacy?.effective_date || "";
        body[locale] = privacyMarkdown(bundle);
    }

    console.log(`\n=== site_pages/privacy ===`);
    LOCALES.forEach((l) => console.log(`  ${l}: "${title[l]}" — ${body[l].length} chars`));
    if (!commit) console.log(`\n--- en preview ---\n${body.en.slice(0, 400)}…\n`);

    if (!commit) return;

    const ref = db.collection("site_pages").doc("privacy");
    const existing = await ref.get();

    if (existing.exists && !force) {
        console.log("  already exists — leaving the admin's copy alone (pass --force to overwrite)");
        return;
    }

    await ref.set(
        {
            id: "privacy",
            slug: "privacy",
            title,
            description,
            body,
            parentId: null,
            order: 10,
            status: "published",
            showInFooter: true,
            updatedAt: FieldValue.serverTimestamp(),
            updatedByEmail: "seed-script",
        },
        { merge: true },
    );
    console.log("  written");
}

async function seedFaqs() {
    const items = bundles.en.home?.faq?.items || [];
    console.log(`\n=== faqs (${items.length} items) ===`);

    for (const [index, enItem] of items.entries()) {
        const id = `faq-${index + 1}`;
        const question = {};
        const answer = {};

        for (const locale of LOCALES) {
            const localised = bundles[locale].home?.faq?.items?.[index];
            question[locale] = localised?.question || enItem.question;
            answer[locale] = localised?.answer || enItem.answer;
        }

        console.log(`  ${id}: ${question.en.slice(0, 60)}…`);
        if (!commit) continue;

        const ref = db.collection("faqs").doc(id);
        if ((await ref.get()).exists && !force) {
            console.log("    already exists — skipped");
            continue;
        }

        await ref.set(
            {
                id,
                question,
                answer,
                order: index,
                status: "published",
                updatedAt: FieldValue.serverTimestamp(),
                updatedByEmail: "seed-script",
            },
            { merge: true },
        );
    }
}

console.log(
    commit
        ? "Writing to Firestore…"
        : "Dry run — nothing will be written. Re-run with --commit to apply.",
);

await seedPrivacy();
await seedFaqs();

console.log(commit ? "\nDone." : "\nDry run complete.");
process.exit(0);
