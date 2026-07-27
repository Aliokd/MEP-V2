"use client";

import { useState } from "react";
import { X, Save, Archive, Globe } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Badge, Button, Input, Panel, Select, Spinner, Textarea } from "../components/ui";
import { LOCALES, LOCALE_LABELS, IDEA_CATEGORIES, type LocalizedText, type Locale } from "@/lib/content";
import type { ContentItem } from "./page";

type Collection = "chapters" | "lessons" | "ideas" | "songs";

/** Which localized fields each content type has. */
const LOCALIZED_FIELDS: Record<Collection, { key: string; label: string; long?: boolean }[]> = {
    chapters: [
        { key: "title", label: "Title" },
        { key: "description", label: "Description", long: true },
    ],
    lessons: [
        { key: "title", label: "Title" },
        { key: "summary", label: "Summary", long: true },
    ],
    ideas: [
        { key: "title", label: "Title" },
        { key: "description", label: "Description", long: true },
        { key: "whyItHelps", label: "Why it helps", long: true },
        { key: "example", label: "Example", long: true },
    ],
    songs: [],
};

export default function ContentEditor({
    collection,
    item,
    onClose,
    onSaved,
}: {
    collection: Collection;
    item: ContentItem | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { adminFetch, can } = useAdmin();
    const [draft, setDraft] = useState<ContentItem>(
        item || ({ id: "", status: "draft", order: 0, title: {}, category: "lyrics" } as ContentItem),
    );
    const [locale, setLocale] = useState<Locale>("en");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isNew = item === null;
    const localizedFields = LOCALIZED_FIELDS[collection];

    const setLocalized = (key: string, value: string) => {
        setDraft((prev) => ({
            ...prev,
            [key]: { ...((prev[key] as LocalizedText) || {}), [locale]: value },
        }));
    };

    const setField = (key: string, value: unknown) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    };

    const save = async (status?: string) => {
        setSaving(true);
        setError(null);
        try {
            const payload = { ...draft, ...(status ? { status } : {}) };
            const res = isNew
                ? await adminFetch(`/api/admin/content/${collection}`, { method: "POST", body: JSON.stringify(payload) })
                : await adminFetch(`/api/admin/content/${collection}/${draft.id}`, { method: "PATCH", body: JSON.stringify(payload) });

            if (!res.ok) throw new Error((await res.json()).error || "Save failed");
            onSaved();
        } catch (err: any) {
            setError(err.message);
            setSaving(false);
        }
    };

    const archive = async () => {
        if (!window.confirm("Archive this? It stops appearing for readers but is not deleted.")) return;
        setSaving(true);
        try {
            const res = await adminFetch(`/api/admin/content/${collection}/${draft.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).error || "Archive failed");
            onSaved();
        } catch (err: any) {
            setError(err.message);
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />

            <aside className="relative w-full max-w-2xl bg-ink-900 border-l border-ink-600 h-full overflow-y-auto">
                <header className="sticky top-0 z-10 bg-ink-900 border-b border-ink-600 px-5 py-4 flex items-start gap-3">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <Badge tone={draft.status === "published" ? "green" : "gold"}>{draft.status}</Badge>
                            <span className="text-xs text-ink-500">{collection}</span>
                        </div>
                        <h2 className="text-base text-ink-100 font-medium">
                            {isNew ? `New ${collection.replace(/s$/, "")}` : "Edit"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-ink-500 hover:text-ink-100 shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </header>

                {error && <p className="mx-5 mt-4 text-sm text-red-300">{error}</p>}

                <div className="p-5 flex flex-col gap-5">
                    {/* Language switcher for the localized fields below */}
                    {localizedFields.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5 text-ink-500" />
                            {LOCALES.map((l) => {
                                const filled = localizedFields.every(
                                    (f) => ((draft[f.key] as LocalizedText) || {})[l]?.trim(),
                                );
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
                                    English is the fallback when this is blank
                                </span>
                            )}
                        </div>
                    )}

                    {localizedFields.map((field) => (
                        <label key={field.key} className="flex flex-col gap-1.5">
                            <span className="text-xs text-ink-400">{field.label}</span>
                            {field.long ? (
                                <Textarea
                                    rows={3}
                                    value={((draft[field.key] as LocalizedText) || {})[locale] || ""}
                                    onChange={(e) => setLocalized(field.key, e.target.value)}
                                />
                            ) : (
                                <Input
                                    value={((draft[field.key] as LocalizedText) || {})[locale] || ""}
                                    onChange={(e) => setLocalized(field.key, e.target.value)}
                                />
                            )}
                        </label>
                    ))}

                    {/* Type-specific fields */}
                    {collection === "ideas" && (
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs text-ink-400">Category</span>
                            <Select value={draft.category || "lyrics"} onChange={(e) => setField("category", e.target.value)}>
                                {IDEA_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </Select>
                        </label>
                    )}

                    {collection === "lessons" && (
                        <>
                            <Field label="Chapter id" value={draft.chapterId || ""} onChange={(v) => setField("chapterId", v)} />
                            <Field label="Video URL" value={draft.videoUrl || ""} onChange={(v) => setField("videoUrl", v)} />
                            <Field
                                label="Poster URL"
                                value={draft.posterUrl || ""}
                                onChange={(v) => setField("posterUrl", v)}
                            />
                            <Field
                                label="Duration (seconds)"
                                value={String(draft.durationSeconds ?? "")}
                                onChange={(v) => setField("durationSeconds", Number(v) || 0)}
                            />
                        </>
                    )}

                    {collection === "songs" && (
                        <>
                            <Field label="Title" value={(draft.title as string) || ""} onChange={(v) => setField("title", v)} />
                            <Field label="Artist" value={draft.artist || ""} onChange={(v) => setField("artist", v)} />
                            <Field label="Audio URL" value={draft.audioUrl || ""} onChange={(v) => setField("audioUrl", v)} />
                            <Field label="Cover URL" value={draft.coverUrl || ""} onChange={(v) => setField("coverUrl", v)} />

                            {/* Practice ships real commercial recordings — an unset
                                licence is a takedown waiting to happen, so it is
                                surfaced rather than buried. */}
                            <Panel className={`p-4 flex flex-col gap-3 ${draft.rights?.licence ? "" : "border-red-500/30"}`}>
                                <span className="text-xs text-ink-400">Rights</span>
                                {!draft.rights?.licence && (
                                    <p className="text-xs text-red-300">
                                        No licence recorded. This song is published without a documented rights position.
                                    </p>
                                )}
                                <Field
                                    label="Licence"
                                    value={draft.rights?.licence || ""}
                                    onChange={(v) => setField("rights", { ...(draft.rights || {}), licence: v })}
                                />
                                <Field
                                    label="Rights holder"
                                    value={draft.rights?.holder || ""}
                                    onChange={(v) => setField("rights", { ...(draft.rights || {}), holder: v })}
                                />
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-xs text-ink-400">Notes</span>
                                    <Textarea
                                        rows={2}
                                        value={draft.rights?.notes || ""}
                                        onChange={(e) => setField("rights", { ...(draft.rights || {}), notes: e.target.value })}
                                    />
                                </label>
                            </Panel>

                            <p className="text-[11px] text-ink-500">
                                Word-level lyric timings aren&apos;t editable here yet — they come from the
                                migration. Editing them needs a timing tool, not a text box.
                            </p>
                        </>
                    )}

                    <Field
                        label="Order"
                        value={String(draft.order ?? 0)}
                        onChange={(v) => setField("order", Number(v) || 0)}
                    />

                    {isNew && (
                        <Field
                            label="Id (optional — generated if blank)"
                            value={draft.id || ""}
                            onChange={(v) => setField("id", v)}
                        />
                    )}

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
                                {draft.status === "published" && (
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

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs text-ink-400">{label}</span>
            <Input value={value} onChange={(e) => onChange(e.target.value)} />
        </label>
    );
}
