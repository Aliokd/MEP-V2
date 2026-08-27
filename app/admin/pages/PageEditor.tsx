"use client";

import { useRef, useState } from "react";
import { X, Save, Archive, Globe, Eye, Pencil } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Badge, Button, Input, Panel, Select, Spinner, Textarea } from "../components/ui";
import { LOCALES, LOCALE_LABELS, pickLocale, type Locale, type LocalizedText, type SitePage, type SitePageKind } from "@/lib/content";
import MarkdownToolbar, { useMarkdownShortcuts } from "../components/MarkdownToolbar";

/** Lowercases, strips accents and punctuation, collapses spaces to hyphens. */
function slugify(value: string): string {
    return value
        .normalize("NFD")
        // Strip the combining marks that NFD just split off (é -> e + U+0301).
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}

/**
 * Minimal Markdown preview — headings, bold, italic, links and lists.
 *
 * Deliberately not markdown-it: pulling the real parser into the client bundle
 * to preview a policy page isn't worth it, and the published page is rendered
 * server-side by the real one either way. This is a sanity check on structure,
 * not a fidelity guarantee.
 */
function previewMarkdown(source: string): string {
    const escape = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    return escape(source)
        .replace(/^### (.*)$/gm, '<h3 class="text-base font-medium text-ink-100 mt-4">$1</h3>')
        .replace(/^## (.*)$/gm, '<h2 class="text-lg font-light text-ink-100 mt-5">$1</h2>')
        .replace(/^# (.*)$/gm, '<h1 class="text-xl font-light text-ink-100 mt-5">$1</h1>')
        .replace(/^\s*[-*] (.*)$/gm, '<li class="ml-4 list-disc text-ink-300">$1</li>')
        .replace(/\*\*(.+?)\*\*/g, '<strong class="text-ink-100">$1</strong>')
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a class="text-green-400 underline" href="$2">$1</a>')
        .replace(/\n{2,}/g, '</p><p class="text-ink-300 mt-3">')
        .replace(/^/, '<p class="text-ink-300">')
        .concat("</p>");
}

export default function PageEditor({
    page,
    allPages,
    defaultKind = "legal",
    onClose,
    onSaved,
}: {
    page: SitePage | null;
    allPages: SitePage[];
    /** Which shelf a brand-new page starts on — the tab it was created from. */
    defaultKind?: SitePageKind;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { adminFetch, can } = useAdmin();
    const isNew = page === null;

    const [slug, setSlug] = useState(page?.slug || "");
    const [slugTouched, setSlugTouched] = useState(!isNew);
    const [title, setTitle] = useState<LocalizedText>(page?.title || {});
    const [description, setDescription] = useState<LocalizedText>(page?.description || {});
    const [body, setBody] = useState<LocalizedText>(page?.body || {});
    const [parentId, setParentId] = useState(page?.parentId || "");
    const [order, setOrder] = useState(String(page?.order ?? 0));
    const [showInFooter, setShowInFooter] = useState(page?.showInFooter ?? false);
    // Which console tab the page files under. Pages that predate the split have
    // no value and are policies, which is also the safe default for a new one:
    // an SEO article filed under Legal is odd, a policy lost in SEO is worse.
    const [kind, setKind] = useState<SitePageKind>(page?.kind || defaultKind);

    const [locale, setLocale] = useState<Locale>("en");
    const [preview, setPreview] = useState(false);
    // The toolbar reads the caret out of the field, so it needs the element.
    const bodyRef = useRef<HTMLTextAreaElement>(null);
    const bodyShortcuts = useMarkdownShortcuts(bodyRef, body[locale] || "", (next) =>
        setBody({ ...body, [locale]: next }),
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Typing an English title fills the slug, until the slug is edited by hand.
    const onTitleChange = (value: string) => {
        setTitle((prev) => ({ ...prev, [locale]: value }));
        if (isNew && !slugTouched && locale === "en") setSlug(slugify(value));
    };

    const save = async (status?: string) => {
        const cleanSlug = slugify(slug);
        if (!cleanSlug) {
            setError("A slug is required — it's the page's URL.");
            return;
        }
        if (!title.en?.trim()) {
            setError("An English title is required — it's the fallback for the other languages.");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const payload = {
                id: cleanSlug,
                slug: cleanSlug,
                title,
                description,
                body,
                parentId: parentId || null,
                order: Number(order) || 0,
                showInFooter,
                kind,
                ...(status ? { status } : {}),
            };

            // The doc id is the slug, so a new page POSTs and an existing one
            // PATCHes. Changing an existing page's slug would orphan the old
            // document, so the field is locked after creation.
            const res = isNew
                ? await adminFetch("/api/admin/content/pages", { method: "POST", body: JSON.stringify(payload) })
                : await adminFetch(`/api/admin/content/pages/${page.id}`, { method: "PATCH", body: JSON.stringify(payload) });

            if (!res.ok) throw new Error((await res.json()).error || "Save failed");
            onSaved();
        } catch (err: any) {
            setError(err.message);
            setSaving(false);
        }
    };

    const archive = async () => {
        if (!page) return;
        if (!window.confirm("Archive this page? It stops being reachable but is not deleted.")) return;
        setSaving(true);
        try {
            const res = await adminFetch(`/api/admin/content/pages/${page.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).error || "Archive failed");
            onSaved();
        } catch (err: any) {
            setError(err.message);
            setSaving(false);
        }
    };

    const parentOptions = allPages.filter((p) => p.id !== page?.id && !p.parentId);
    const currentStatus = page?.status || "draft";

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />

            <aside className="relative w-full max-w-3xl bg-ink-900 border-l border-ink-600 h-full overflow-y-auto">
                <header className="sticky top-0 z-10 bg-ink-900 border-b border-ink-600 px-5 py-4 flex items-start gap-3">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <Badge tone={currentStatus === "published" ? "green" : "gold"}>{currentStatus}</Badge>
                            {slug && <span className="text-xs text-ink-500">/{slugify(slug)}</span>}
                        </div>
                        <h2 className="text-base text-ink-100 font-medium">
                            {isNew ? "New page" : pickLocale(title, "en") || "Edit page"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-ink-500 hover:text-ink-100 shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </header>

                {error && <p className="mx-5 mt-4 text-sm text-red-300">{error}</p>}

                <div className="p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-ink-500" />
                        {LOCALES.map((l) => {
                            const filled = Boolean(title[l]?.trim() && body[l]?.trim());
                            return (
                                <button
                                    key={l}
                                    onClick={() => setLocale(l)}
                                    className={`px-3 py-1 rounded-full text-xs transition-colors flex items-center gap-1.5 ${
                                        locale === l ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-100"
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${filled ? "bg-green-500" : "bg-ink-500"}`} />
                                    {LOCALE_LABELS[l]}
                                </button>
                            );
                        })}
                        {locale !== "en" && (
                            <span className="text-[11px] text-ink-500 ml-auto">
                                English shows when this is blank
                            </span>
                        )}
                    </div>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs text-ink-400">Title</span>
                        <Input value={title[locale] || ""} onChange={(e) => onTitleChange(e.target.value)} />
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs text-ink-400">
                            Description — shown under the title and used as the search-engine summary
                        </span>
                        <Textarea
                            rows={2}
                            value={description[locale] || ""}
                            onChange={(e) => setDescription({ ...description, [locale]: e.target.value })}
                        />
                    </label>

                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-ink-400">Content — Markdown</span>

                            {/* Hidden while previewing: there is no field to act on. */}
                            {!preview && (
                                <MarkdownToolbar
                                    textareaRef={bodyRef}
                                    value={body[locale] || ""}
                                    onChange={(next) => setBody({ ...body, [locale]: next })}
                                />
                            )}

                            <button
                                onClick={() => setPreview((v) => !v)}
                                className="ml-auto text-[11px] text-ink-400 hover:text-ink-100 flex items-center gap-1"
                            >
                                {preview ? <Pencil className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                {preview ? "Edit" : "Preview"}
                            </button>
                        </div>

                        {preview ? (
                            <div
                                className="min-h-[300px] p-4 rounded-xl bg-ink-850 border border-ink-600 overflow-y-auto"
                                dangerouslySetInnerHTML={{ __html: previewMarkdown(body[locale] || "") }}
                            />
                        ) : (
                            <Textarea
                                ref={bodyRef}
                                rows={16}
                                value={body[locale] || ""}
                                onChange={(e) => setBody({ ...body, [locale]: e.target.value })}
                                onKeyDown={bodyShortcuts}
                                className="font-mono text-xs leading-relaxed"
                                placeholder={"## A heading\n\nA paragraph of text.\n\n- A list item\n- Another\n\n[A link](https://veinote.com)"}
                            />
                        )}
                        <span className="text-[11px] text-ink-500">
                            Markdown only. Raw HTML is stripped when the page renders, so a pasted
                            &lt;script&gt; can never reach a visitor.
                        </span>
                    </div>

                    <Panel className="p-4 flex flex-col gap-3">
                        <span className="text-xs text-ink-400">Placement</span>

                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs text-ink-400">
                                URL slug {!isNew && <span className="text-ink-600">— fixed after creation</span>}
                            </span>
                            <Input
                                value={slug}
                                disabled={!isNew}
                                onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
                                placeholder="terms"
                                className="font-mono"
                            />
                            <span className="text-[11px] text-ink-500">
                                veinote.com/{slugify(slug) || "…"}
                            </span>
                        </label>

                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs text-ink-400">Section</span>
                            <Select value={kind} onChange={(e) => setKind(e.target.value as SitePageKind)}>
                                <option value="legal">Legal — policies and terms</option>
                                <option value="seo">SEO — guides written to be found</option>
                            </Select>
                            <span className="text-[11px] text-ink-500">
                                Which tab of this console the page is listed under. It has no effect
                                on the page itself.
                            </span>
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs text-ink-400">Parent page</span>
                                <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                                    <option value="">None — top level</option>
                                    {parentOptions.map((p) => (
                                        <option key={p.id} value={p.slug}>
                                            {pickLocale(p.title, "en") || p.slug}
                                        </option>
                                    ))}
                                </Select>
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs text-ink-400">Order</span>
                                <Input value={order} onChange={(e) => setOrder(e.target.value)} inputMode="numeric" />
                            </label>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowInFooter((v) => !v)}
                            className="flex items-center gap-2.5 text-left group"
                        >
                            <span
                                className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
                                    showInFooter ? "bg-green-500 border-green-500" : "border-ink-500 group-hover:border-ink-400"
                                }`}
                            >
                                {showInFooter && <span className="w-1.5 h-1.5 rounded-full bg-ink-950" />}
                            </span>
                            <span className="text-sm text-ink-200">Link this page in the site footer</span>
                        </button>
                    </Panel>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-ink-600">
                        <Button onClick={() => save()} disabled={saving}>
                            {saving ? <Spinner className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                            Save draft
                        </Button>
                        {can("content.publish") && (
                            <>
                                <Button variant="primary" onClick={() => save("published")} disabled={saving}>
                                    Publish
                                </Button>
                                {currentStatus === "published" && (
                                    <Button onClick={() => save("draft")} disabled={saving}>
                                        Unpublish
                                    </Button>
                                )}
                                {!isNew && (
                                    <Button variant="danger" onClick={archive} disabled={saving} className="ml-auto">
                                        <Archive className="w-3.5 h-3.5" /> Archive
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </aside>
        </div>
    );
}
