"use client";

import { useState } from "react";
import { X, Save, Archive, Globe, Eye, Check } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Badge, Button, Input, Panel, Select, Spinner, Textarea } from "../components/ui";
import { LOCALES, LOCALE_LABELS, IDEA_CATEGORIES, type LocalizedText, type Locale } from "@/lib/content";
import type { ContentItem } from "./page";
import MediaUpload from "../components/MediaUpload";
import BlockEditor from "./BlockEditor";
import ContentPreview from "./ContentPreview";
import PracticeSectionEditor from "./PracticeSectionEditor";
import type { CmsPracticeSection } from "@/lib/practiceLibrary";
import type { LessonBlock } from "@/lib/lessonBlocks";
import { uploadContentMedia, type VideoProbe } from "@/lib/uploadContentMedia";

type Collection = "chapters" | "lessons" | "ideas" | "songs" | "melodies";

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
    melodies: [],
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
    /**
     * A blank row of the right shape.
     *
     * `title` is a localized map everywhere except practice songs, where it is a
     * plain string — one initial shape for all four collections handed the songs
     * form an object where it expected text, and the preview crashed the console
     * the moment New song was pressed, because React refuses to render an object
     * as a child.
     */
    const [draft, setDraft] = useState<ContentItem>(
        item ||
            ({
                id: "",
                status: "draft",
                order: 0,
                title: collection === "songs" || collection === "melodies" ? "" : {},
                ...(collection === "ideas" ? { category: "lyrics" } : {}),
                ...(collection === "songs" ? { sections: [], available: false } : {}),
                // Offered by default: a melody is audio and a title, and there
                // is no half-finished state worth publishing but withholding.
                ...(collection === "melodies" ? { instrument: "piano", available: true } : {}),
            } as ContentItem),
    );
    const [locale, setLocale] = useState<Locale>("en");
    // Only consulted below xl, where the two panes share the space.
    const [pane, setPane] = useState<"edit" | "preview">("edit");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isNew = item === null;
    const localizedFields = LOCALIZED_FIELDS[collection];
    const [posterStatus, setPosterStatus] = useState<string | null>(null);

    /** Names the uploaded object after the thing it belongs to, not "blob". */
    const mediaNameHint =
        (typeof draft.title === "string" ? draft.title : draft.title?.en) || draft.id || collection;

    /**
     * Runs as soon as a video file is chosen, before the upload starts. Fills in
     * the duration and uploads the captured first frame as the poster, so neither
     * has to be done by hand — or by running ffmpeg.
     */
    const handleVideoProbed = async (probe: VideoProbe, file: File) => {
        if (probe.durationSeconds > 0) setField("durationSeconds", probe.durationSeconds);

        if (!probe.poster) {
            setPosterStatus("Couldn't capture a frame from this video. Add a poster by hand.");
            return;
        }
        if (draft.posterUrl) {
            setPosterStatus("Kept the existing poster. Upload a new one to replace it.");
            return;
        }

        setPosterStatus("Capturing poster from the video…");
        try {
            const posterFile = new File([probe.poster], `${file.name}-poster.jpg`, { type: "image/jpeg" });
            const { done } = uploadContentMedia(posterFile, "poster", mediaNameHint, () => {});
            setField("posterUrl", await done);
            setPosterStatus("Poster captured from the video's first frame.");
        } catch (err: any) {
            setPosterStatus(`Poster upload failed (${err.message}). Add one by hand.`);
        }
    };

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

            {/* Wide enough for the form and the preview to sit side by side. Below
                xl there isn't room for both, so the two share the pane and the
                header toggle swaps between them. */}
            <aside className="relative w-full max-w-6xl bg-ink-900 border-l border-ink-600 h-full flex flex-col">
                <header className="shrink-0 bg-ink-900 border-b border-ink-600 px-5 py-4 flex items-start gap-3">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <Badge tone={draft.status === "published" ? "green" : "gold"}>{draft.status}</Badge>
                            <span className="text-xs text-ink-500">{collection}</span>
                        </div>
                        <h2 className="text-base text-ink-100 font-medium">
                            {isNew ? `New ${collection.replace(/s$/, "")}` : "Edit"}
                        </h2>
                    </div>
                    <button
                        onClick={() => setPane(pane === "edit" ? "preview" : "edit")}
                        className="xl:hidden flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-100 shrink-0 transition-colors"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        {pane === "edit" ? "Preview" : "Edit"}
                    </button>
                    <button onClick={onClose} className="text-ink-500 hover:text-ink-100 shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </header>

                <div className="flex-1 min-h-0 flex">
                    {/* Each pane scrolls on its own, so the preview stays put while
                        a long form is scrolled — and the other way round. */}
                    <div
                        className={`flex-1 min-w-0 overflow-y-auto ${pane === "preview" ? "hidden xl:block" : ""}`}
                    >
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

                            <MediaUpload
                                label="Video"
                                kind="video"
                                value={draft.videoUrl || ""}
                                onChange={(url) => setField("videoUrl", url)}
                                nameHint={mediaNameHint}
                                onVideoProbed={handleVideoProbed}
                                hint="Duration is read from the file, and the first frame becomes the poster automatically."
                            />

                            <MediaUpload
                                label="Poster image"
                                kind="poster"
                                value={draft.posterUrl || ""}
                                onChange={(url) => setField("posterUrl", url)}
                                nameHint={mediaNameHint}
                                hint={
                                    posterStatus ||
                                    "Shown before playback starts. Without one the lesson is a blank grey box."
                                }
                            />

                            <Field
                                label="Duration (seconds)"
                                value={String(draft.durationSeconds ?? "")}
                                onChange={(v) => setField("durationSeconds", Number(v) || 0)}
                            />

                            <BlockEditor
                                blocks={(draft.blocks as LessonBlock[]) || []}
                                locale={locale}
                                nameHint={mediaNameHint}
                                onChange={(blocks) => setField("blocks", blocks)}
                            />
                        </>
                    )}

                    {collection === "melodies" && (
                        <>
                            <Field label="Title" value={(draft.title as string) || ""} onChange={(v) => setField("title", v)} />

                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs text-ink-400">Instrument</span>
                                <Select
                                    value={draft.instrument || "piano"}
                                    onChange={(e) => setField("instrument", e.target.value)}
                                    className="w-48"
                                >
                                    <option value="piano">Piano</option>
                                    <option value="guitar">Guitar</option>
                                </Select>
                                <span className="text-[11px] text-ink-500">
                                    Shown on the card so someone can pick the one they can play back on.
                                </span>
                            </label>

                            <MediaUpload
                                label="Melody"
                                kind="audio"
                                value={draft.audioUrl || ""}
                                onChange={(url) => setField("audioUrl", url)}
                                nameHint={mediaNameHint}
                                hint="A short single-note phrase: no chords, no backing. A few seconds is enough."
                            />

                            {/* Offered is separate from published, the same as songs:
                                a melody can exist here while its take is still being
                                recorded without appearing in the exercise. */}
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <span
                                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                        draft.available ? "bg-green-500 border-green-500" : "border-ink-500"
                                    }`}
                                >
                                    {draft.available && <Check className="w-3 h-3 text-ink-950" />}
                                </span>
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={Boolean(draft.available)}
                                    onChange={(e) => setField("available", e.target.checked)}
                                />
                                <span className="flex flex-col">
                                    <span className="text-xs text-ink-300">Offer this melody</span>
                                    <span className="text-[11px] text-ink-500">
                                        Off keeps it out of Practice 3 entirely: a card with no audio is a dead end.
                                    </span>
                                </span>
                            </label>
                        </>
                    )}

                    {collection === "songs" && (
                        <>
                            <Field label="Title" value={(draft.title as string) || ""} onChange={(v) => setField("title", v)} />
                            <Field label="Artist" value={draft.artist || ""} onChange={(v) => setField("artist", v)} />
                            <MediaUpload
                                label="Audio"
                                kind="audio"
                                value={draft.audioUrl || ""}
                                onChange={(url) => setField("audioUrl", url)}
                                nameHint={mediaNameHint}
                            />
                            <MediaUpload
                                label="Cover image"
                                kind="image"
                                value={draft.coverUrl || ""}
                                onChange={(url) => setField("coverUrl", url)}
                                nameHint={mediaNameHint}
                            />

                            {/* Playable is a separate decision from published: a song
                                can sit in the chooser as "coming soon" while its
                                structure is still being mapped. */}
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <span
                                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                        draft.available ? "bg-green-500 border-green-500" : "border-ink-500"
                                    }`}
                                >
                                    {draft.available && <Check className="w-3 h-3 text-ink-950" />}
                                </span>
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={Boolean(draft.available)}
                                    onChange={(e) => setField("available", e.target.checked)}
                                />
                                <span className="flex flex-col">
                                    <span className="text-xs text-ink-300">Ready to practise with</span>
                                    <span className="text-[11px] text-ink-500">
                                        Off shows it greyed out in the chooser as coming soon.
                                    </span>
                                </span>
                            </label>

                            <PracticeSectionEditor
                                sections={(draft.sections as CmsPracticeSection[]) || []}
                                audioUrl={draft.audioUrl || ""}
                                durationSeconds={draft.durationSeconds ?? null}
                                onChange={(sections) => setField("sections", sections)}
                                onDuration={(seconds) => setField("durationSeconds", seconds)}
                            />

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
                                Word-by-word timings from the original import are kept but not editable
                                here. Practice works in sections, which are mapped above.
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
                            label="Id (optional, generated if blank)"
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
                    </div>

                    <div
                        className={`w-full xl:w-[460px] shrink-0 border-l border-ink-600 bg-ink-950 overflow-y-auto p-5 ${
                            pane === "edit" ? "hidden xl:block" : ""
                        }`}
                    >
                        <ContentPreview collection={collection} draft={draft} locale={locale} />
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
