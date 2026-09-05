import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import en from "@/locales/en.json";
import no from "@/locales/no.json";
import sv from "@/locales/sv.json";
import { LOCALES, type Locale } from "@/lib/content";
import { COOKIES_FALLBACK_MD } from "@/lib/cookiePageBody";
import { LYRICS_IDEAS_BY_LANGUAGE as IDEAS_BY_LANGUAGE } from "@/app/platform/data/ideas";
import { PRACTICE_SONGS } from "@/app/platform/practice/data/practiceSongs";

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

    // "legal" is the Legal tab's button: every code-backed policy page at once,
    // each skipped if it is already in the CMS. Naming one directly still works,
    // which is what the seed script and any future one-page repair need.
    const wants = (name: string) => target === "all" || target === name;
    const wantsLegal = (name: string) => wants(name) || target === "legal";

    if (wantsLegal("privacy")) {
        const ref = adminDb.collection("site_pages").doc("privacy");
        const existing = await ref.get();

        if (existing.exists && !force) {
            skipped.push("privacy: already in the CMS");
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

    if (wantsLegal("cookies")) {
        const ref = adminDb.collection("site_pages").doc("cookies");
        const existing = await ref.get();

        if (existing.exists && !force) {
            skipped.push("cookies: already in the CMS");
        } else {
            const title: Record<string, string> = {};
            const description: Record<string, string> = {};
            const body: Record<string, string> = {};

            for (const locale of LOCALES) {
                const bundle = BUNDLES[locale];
                title[locale] = bundle?.cookies?.page_title || "Cookie settings";
                description[locale] = bundle?.cookies?.page_intro || "";
                // The prose under the switches, in English for every locale —
                // it is the same fallback the page renders when nothing is
                // published, so importing changes who can edit the words, not
                // which words are on the page. Translating them is then an
                // ordinary edit in the console.
                body[locale] = COOKIES_FALLBACK_MD.trim();
            }

            await ref.set(
                {
                    id: "cookies",
                    slug: "cookies",
                    title,
                    description,
                    body,
                    parentId: null,
                    order: 20,
                    status: "published",
                    kind: "legal",
                    // The footer links /cookies by hand from every content page,
                    // the same way it does /privacy. Ticking this too would put
                    // the link there twice.
                    showInFooter: false,
                    updatedAt: FieldValue.serverTimestamp(),
                    updatedByEmail: admin.email,
                },
                { merge: true },
            );
            imported.push("cookies");
        }
    }

    if (target === "all" || target === "faqs") {
        const items: { question: string; answer: string }[] = en?.home?.faq?.items || [];

        for (const [index, item] of items.entries()) {
            const id = `faq-${index + 1}`;
            const ref = adminDb.collection("faqs").doc(id);

            if ((await ref.get()).exists && !force) {
                skipped.push(`${id}: already in the CMS`);
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
                skipped.push(`${idea.id}: already in the CMS`);
                continue;
            }
            await ref.set(
                { ...idea, updatedAt: FieldValue.serverTimestamp(), updatedByEmail: admin.email },
                { merge: true },
            );
            imported.push(idea.id);
        }
    }

    if (target === "all" || target === "songs") {
        // The bundled practice library, structure and all. The audio stays on
        // its /Practice/Songs public paths — the files ship with the app, and
        // an import must not silently re-host them.
        for (const [index, song] of PRACTICE_SONGS.entries()) {
            const ref = adminDb.collection("practice_songs").doc(song.id);
            if ((await ref.get()).exists && !force) {
                skipped.push(`${song.id}: already in the CMS`);
                continue;
            }
            const lastSection = song.sections?.[song.sections.length - 1];
            await ref.set(
                {
                    id: song.id,
                    title: song.title,
                    artist: song.artist,
                    audioUrl: song.audioUrl,
                    coverUrl: song.coverUrl || null,
                    sections: song.sections || [],
                    durationSeconds: lastSection ? Math.ceil(lastSection.end) : null,
                    available: song.available,
                    order: index,
                    status: "published",
                    // These are real commercial recordings; the position was never
                    // recorded in code, so the CMS surfaces the gap instead of
                    // inventing one.
                    rights: { licence: null, holder: null, notes: "Imported from code. Rights not yet recorded." },
                    updatedAt: FieldValue.serverTimestamp(),
                    updatedByEmail: admin.email,
                },
                { merge: true },
            );
            imported.push(song.id);
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
