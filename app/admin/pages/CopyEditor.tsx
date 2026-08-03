"use client";

import { useState } from "react";
import { X, Save, RotateCcw, Globe, ExternalLink } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Badge, Button, Input, Panel, Spinner, Textarea } from "../components/ui";
import { LOCALES, LOCALE_LABELS, type Locale, type LocalizedText } from "@/lib/content";

export interface CopyRow {
    /** The translation key, which is also the document id. */
    key: string;
    /** The English string as it exists in the locale files — the built-in default. */
    codeValue: string;
    /** The published override, when one exists. */
    override?: LocalizedText;
    status?: string;
    updatedByEmail?: string | null;
}

/** Long strings get a textarea; short ones a single line. */
const LONG_THRESHOLD = 90;

export default function CopyEditor({
    row,
    onClose,
    onSaved,
}: {
    row: CopyRow;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { adminFetch, can } = useAdmin();
    const [value, setValue] = useState<LocalizedText>(row.override || {});
    const [locale, setLocale] = useState<Locale>("en");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isLong = row.codeValue.length > LONG_THRESHOLD;
    const hasOverride = Boolean(row.override);

    const save = async (status: string) => {
        setSaving(true);
        setError(null);
        try {
            const payload = { id: row.key, key: row.key, value, status };
            // The document id is the translation key, so the first save creates
            // it and later ones update in place.
            const res = hasOverride
                ? await adminFetch(`/api/admin/content/copy/${encodeURIComponent(row.key)}`, {
                      method: "PATCH",
                      body: JSON.stringify(payload),
                  })
                : await adminFetch("/api/admin/content/copy", {
                      method: "POST",
                      body: JSON.stringify(payload),
                  });

            if (!res.ok) throw new Error((await res.json()).error || "Save failed");
            onSaved();
        } catch (err: any) {
            setError(err.message);
            setSaving(false);
        }
    };

    /**
     * Reverting unpublishes rather than deleting: getCopyOverrides() only reads
     * published documents, so the site falls straight back to the code value
     * while the edit stays recoverable.
     */
    const revert = async () => {
        if (!window.confirm("Revert to the text built into the site? Your edit is kept as a draft.")) return;
        await save("draft");
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />

            <aside className="relative w-full max-w-2xl bg-ink-900 border-l border-ink-600 h-full overflow-y-auto">
                <header className="sticky top-0 z-10 bg-ink-900 border-b border-ink-600 px-5 py-4 flex items-start gap-3">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <Badge tone={row.status === "published" ? "green" : hasOverride ? "gold" : "neutral"}>
                                {row.status === "published" ? "edited" : hasOverride ? "draft" : "using the built-in text"}
                            </Badge>
                        </div>
                        <h2 className="text-base text-ink-100 font-medium truncate">{row.key}</h2>
                    </div>
                    <button onClick={onClose} className="text-ink-500 hover:text-ink-100 shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </header>

                {error && <p className="mx-5 mt-4 text-sm text-red-300">{error}</p>}

                <div className="p-5 flex flex-col gap-4">
                    <Panel className="p-3.5 flex flex-col gap-1">
                        <span className="text-[11px] text-ink-500">Built into the site</span>
                        <p className="text-sm text-ink-300 whitespace-pre-wrap">{row.codeValue}</p>
                    </Panel>

                    <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-ink-500" />
                        {LOCALES.map((l) => (
                            <button
                                key={l}
                                onClick={() => setLocale(l)}
                                className={`px-3 py-1 rounded-full text-xs transition-colors flex items-center gap-1.5 ${
                                    locale === l ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-100"
                                }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${value[l]?.trim() ? "bg-green-500" : "bg-ink-500"}`} />
                                {LOCALE_LABELS[l]}
                            </button>
                        ))}
                    </div>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs text-ink-400">Your text ({LOCALE_LABELS[locale]})</span>
                        {isLong ? (
                            <Textarea
                                rows={5}
                                value={value[locale] || ""}
                                onChange={(e) => setValue({ ...value, [locale]: e.target.value })}
                                placeholder="Leave blank to use the built-in text"
                            />
                        ) : (
                            <Input
                                value={value[locale] || ""}
                                onChange={(e) => setValue({ ...value, [locale]: e.target.value })}
                                placeholder="Leave blank to use the built-in text"
                            />
                        )}
                        <span className="text-[11px] text-ink-500">
                            Blank in a language falls back to your English text, then to the built-in text.
                            Nothing here changes the layout — only the words.
                        </span>
                    </label>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-ink-600">
                        <Button onClick={() => save("draft")} disabled={saving}>
                            {saving ? <Spinner className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                            Save draft
                        </Button>
                        {can("content.publish") && (
                            <Button variant="primary" onClick={() => save("published")} disabled={saving}>
                                Publish
                            </Button>
                        )}
                        {hasOverride && row.status === "published" && can("content.publish") && (
                            <Button variant="danger" onClick={revert} disabled={saving} className="ml-auto">
                                <RotateCcw className="w-3.5 h-3.5" /> Revert to built-in
                            </Button>
                        )}
                    </div>

                    <a
                        href={row.key.startsWith("about.") ? "/about" : "/"}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-[11px] text-ink-400 hover:text-ink-100 flex items-center gap-1 self-start"
                    >
                        View the page this appears on <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </aside>
        </div>
    );
}
