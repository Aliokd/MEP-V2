import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { withAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";
import { sendMail } from "@/lib/email/send";
import { getCopyOverrides } from "@/lib/siteCopy";
import { tServer, tServerList, resolveLocale, type EmailLocale } from "@/lib/email/locale";
import { EMAIL_TEMPLATES, getEmailTemplate, templateKey } from "@/lib/email/templateRegistry";
import { welcomeEmail } from "@/lib/email/templates/welcome";
import { betaWelcomeEmail } from "@/lib/email/templates/betaWelcome";
import { collabInviteEmail } from "@/lib/email/templates/collabInvite";
import { LOCALES } from "@/lib/content";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://veinote.com";

/**
 * Renders a template with stand-in values, so the admin sees the real thing
 * rather than a description of it.
 *
 * The beta email's password is a visible dummy — a preview must never carry a
 * real credential, and one that looked real would invite pasting it somewhere.
 */
function renderSample(id: string, locale: EmailLocale, overrides: Awaited<ReturnType<typeof getCopyOverrides>>) {
    switch (id) {
        case "beta_welcome":
            return betaWelcomeEmail(
                locale,
                {
                    name: "Alex",
                    loginEmail: "alex@example.com",
                    password: "not-a-real-password",
                    signInUrl: `${APP_URL}/signin`,
                },
                overrides,
            );
        case "collab_invite":
            return collabInviteEmail(
                locale,
                {
                    inviter: "Sofia",
                    project: "Empty Chair",
                    joinUrl: `${APP_URL}/signin`,
                    trialDays: 14,
                    waitlistMode: false,
                },
                overrides,
            );
        default:
            return welcomeEmail(locale, { name: "Alex", appUrl: `${APP_URL}/platform/create` }, overrides);
    }
}

/** Every template, its current wording per language, and a rendered preview. */
export const GET = withAdmin("announcements.read", async (request) => {
    const url = new URL(request.url);
    const previewLocale = resolveLocale(url.searchParams.get("locale"));
    const overrides = await getCopyOverrides();

    const templates = EMAIL_TEMPLATES.map((template) => {
        const fields = template.fields.map((field) => {
            const key = templateKey(template, field);
            const isList = template.listFields?.includes(field);

            // Shown side by side in the editor: what ships in the code, and what
            // an editor has changed it to.
            const shipped: Record<string, string> = {};
            const edited: Record<string, string> = {};

            for (const locale of LOCALES) {
                shipped[locale] = isList
                    ? tServerList(locale, key).join("\n")
                    : tServer(locale, key);
                const override = overrides[key]?.[locale];
                if (typeof override === "string") edited[locale] = override;
            }

            return { field, key, isList: Boolean(isList), shipped, edited };
        });

        const sample = renderSample(template.id, previewLocale, overrides);

        return {
            ...template,
            fields,
            preview: { subject: sample.subject, html: sample.html },
            edited: fields.some((f) => Object.values(f.edited).some((v) => v?.trim())),
        };
    });

    return NextResponse.json({ templates, previewLocale });
});

/**
 * Sends one template to the admin running the check, with sample values.
 *
 * Proves the wording and the mail path together — the two things that break
 * independently and look identical from the console.
 */
export const POST = withAdmin("announcements.send", async (request, admin) => {
    const { id, locale } = await request.json();

    const template = getEmailTemplate(id);
    if (!template) return NextResponse.json({ error: `Unknown template "${id}"` }, { status: 400 });
    if (!admin.email) {
        return NextResponse.json({ error: "Your admin record has no email address" }, { status: 400 });
    }

    const sample = renderSample(template.id, resolveLocale(locale), await getCopyOverrides());

    try {
        await sendMail({
            to: admin.email,
            subject: `[TEST] ${sample.subject}`,
            html: sample.html,
            text: sample.text,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 502 });
    }

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "email.template.test",
        targetType: "email_template",
        targetId: template.id,
        targetLabel: template.label,
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, sentTo: admin.email });
});

/**
 * Saves edited wording.
 *
 * Writes to `site_copy`, the same store that overrides on-site text — an email
 * is copy, and keeping it in one place means the fallback, the publish state and
 * the revert behaviour are all the ones already built rather than a second set.
 */
export const PATCH = withAdmin("announcements.write", async (request, admin) => {
    const { id, values } = await request.json();

    const template = getEmailTemplate(id);
    if (!template) return NextResponse.json({ error: `Unknown template "${id}"` }, { status: 400 });
    if (!values || typeof values !== "object") {
        return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
    }

    const batch = adminDb.batch();
    let changed = 0;

    for (const field of template.fields) {
        const perLocale = values[field];
        if (!perLocale || typeof perLocale !== "object") continue;

        const key = templateKey(template, field);
        const value: Record<string, string> = {};
        for (const locale of LOCALES) {
            const text = perLocale[locale];
            if (typeof text === "string" && text.trim()) value[locale] = text;
        }

        const ref = adminDb.collection("site_copy").doc(key);

        if (Object.keys(value).length === 0) {
            // Cleared in every language means "use the shipped wording again".
            // Unpublished rather than deleted, so the edit stays recoverable.
            batch.set(ref, { key, status: "draft", updatedByEmail: admin.email, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        } else {
            batch.set(
                ref,
                {
                    id: key,
                    key,
                    value,
                    status: "published",
                    updatedByEmail: admin.email,
                    updatedAt: FieldValue.serverTimestamp(),
                },
                { merge: true },
            );
        }
        changed += 1;
    }

    await batch.commit();

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "email.template.update",
        targetType: "email_template",
        targetId: template.id,
        targetLabel: template.label,
        after: { fieldsWritten: changed },
        ...auditContext(request),
    });

    return NextResponse.json({ success: true, fieldsWritten: changed });
});
