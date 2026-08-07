import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import en from "@/locales/en.json";
import no from "@/locales/no.json";
import sv from "@/locales/sv.json";
import { LOCALES, type Locale } from "@/lib/content";
import { LYRICS_IDEAS_BY_LANGUAGE as IDEAS_BY_LANGUAGE } from "@/app/platform/data/ideas";

export const dynamic = "force-dynamic";

/**
 * Imports the copy that still lives in locales/*.json into the CMS.
 *
 * The same job as scripts/seed-site-pages.mjs, exposed as a button. The script
 * needs GOOGLE_APPLICATION_CREDENTIALS on the machine running it; this route
 * runs where the Admin SDK is already authenticated, so an editor can do the
 * import without ever handling a service-account key.
 *
 * Idempotent: an existing document is left alone unless `force` is passed, so
 * pressing the button twice can't revert wording someone has since edited.
 */

const BUNDLES: Record<Locale, any> = { en, no, sv };

const PRIVACY_SECTION_IDS = [
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

/** Renders the privacy sections as markdown: each title an h2, body beneath. */
function privacyMarkdown(bundle: any): string {
    return PRIVACY_SECTION_IDS.map((id) => {
        const section = bundle?.privacy?.sections?.[id];
        if (!section) return null;
        // The old template used whitespace-pre-line, so single newlines were
        // meaningful. Markdown needs two trailing spaces to keep them.
        const body = String(section.body || "").split("\n").join("  \n");
        return `## ${section.title}\n\n${body}`;
    })
        .filter(Boolean)
        .join("\n\n");
}

export const POST = withAdmin("content.publish", async (request, admin) => {
    const { target = "all", force = false } = await request.json().catch(() => ({}));

    const imported: string[] = [];
    const skipped: string[] = [];

    if (target === "all" || target === "privacy") {
        const ref = adminDb.collection("site_pages").doc("privacy");
        const existing = await ref.get();

        if (existing.exists && !force) {
            skipped.push("privacy — already in the CMS");
        } else {
            const title: Record<string, string> = {};
            const description: Record<string, string> = {};
            const body: Record<string, string> = {};

            for (const locale of LOCALES) {
                const bundle = BUNDLES[locale];
                title[locale] = bundle?.privacy?.title || "Privacy Policy";
                description[locale] = bundle?.privacy?.effective_date || "";
                body[locale] = privacyMarkdown(bundle);
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
                    showInFooter: false, // the footer already links /privacy by hand
                    updatedAt: FieldValue.serverTimestamp(),
                    updatedByEmail: admin.email,
                },
                { merge: true },
            );
            imported.push("privacy");
        }
    }

    if (target === "all" || target === "faqs") {
        const items: { question: string; answer: string }[] = en?.home?.faq?.items || [];

        for (const [index, item] of items.entries()) {
            const id = `faq-${index + 1}`;
            const ref = adminDb.collection("faqs").doc(id);

            if ((await ref.get()).exists && !force) {
                skipped.push(`${id} — already in the CMS`);
                continue;
            }

            const question: Record<string, string> = {};
            const answer: Record<string, string> = {};

            for (const locale of LOCALES) {
                const localised = BUNDLES[locale]?.home?.faq?.items?.[index];
                question[locale] = localised?.question || item.question;
                answer[locale] = localised?.answer || item.answer;
            }

            await ref.set(
                {
                    id,
                    question,
                    answer,
                    order: index,
                    status: "published",
                    updatedAt: FieldValue.serverTimestamp(),
                    updatedByEmail: admin.email,
                },
                { merge: true },
            );
            imported.push(id);
        }
    }

    if (target === "all" || target === "ideas") {
        // The three language arrays share ids (lyrics-1 … lyrics-38), so they
        // merge into one document per card carrying all three languages.
        const byId = new Map<string, Record<string, any>>();

        for (const locale of LOCALES) {
            const ideas = IDEAS_BY_LANGUAGE[locale] || [];
            ideas.forEach((idea, index) => {
                const entry = byId.get(idea.id) || {
                    id: idea.id,
                    category: idea.category,
                    order: index,
                    status: "published",
                    title: {} as Record<string, string>,
                    description: {} as Record<string, string>,
                    whyItHelps: {} as Record<string, string>,
                    example: {} as Record<string, string>,
                };
                entry.title[locale] = idea.title;
                entry.description[locale] = idea.description;
                if (idea.whyItHelps) entry.whyItHelps[locale] = idea.whyItHelps;
                if (idea.example) entry.example[locale] = idea.example;
                byId.set(idea.id, entry);
            });
        }

        for (const idea of byId.values()) {
            const ref = adminDb.collection("ideas").doc(idea.id);
            if ((await ref.get()).exists && !force) {
                skipped.push(`${idea.id} — already in the CMS`);
                continue;
            }
            await ref.set(
                { ...idea, updatedAt: FieldValue.serverTimestamp(), updatedByEmail: admin.email },
                { merge: true },
            );
            imported.push(idea.id);
        }
    }

    if (imported.length > 0) {
        await writeAudit({
            actorUid: admin.uid,
            actorEmail: admin.email,
            actorRole: admin.role,
            action: "content.import_from_code",
            targetType: "content",
            targetId: target,
            targetLabel: `imported ${imported.length} item(s)`,
            after: { imported, forced: Boolean(force) },
            ...auditContext(request),
        });
    }

    return NextResponse.json({ success: true, imported, skipped });
});
