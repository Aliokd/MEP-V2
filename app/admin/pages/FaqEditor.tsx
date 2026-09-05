"use client";

import { useState } from "react";
import { X, Save, Archive, Globe } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Badge, Button, Input, Spinner, Textarea } from "../components/ui";
import { LOCALES, LOCALE_LABELS, pickLocale, type Locale, type LocalizedText } from "@/lib/content";

export interface FaqRow {
    id: string;
    question: LocalizedText;
    answer: LocalizedText;
    order: number;
    status: string;
    updatedAt?: number | null;
    updatedByEmail?: string | null;
}

export default function FaqEditor({
    faq,
    onClose,
    onSaved,
}: {
    faq: FaqRow | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { adminFetch, can } = useAdmin();
    const isNew = faq === null;

    const [question, setQuestion] = useState<LocalizedText>(faq?.question || {});
    const [answer, setAnswer] = useState<LocalizedText>(faq?.answer || {});
    const [order, setOrder] = useState(String(faq?.order ?? 0));
    const [locale, setLocale] = useState<Locale>("en");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const save = async (status?: string) => {
        if (!question.en?.trim()) {
            setError("An English question is required. It's the fallback for the other languages.");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const payload = { question, answer, order: Number(order) || 0, ...(status ? { status } : {}) };
            const res = isNew
                ? await adminFetch("/api/admin/content/faqs", { method: "POST", body: JSON.stringify(payload) })
                : await adminFetch(`/api/admin/content/faqs/${faq.id}`, { method: "PATCH", body: JSON.stringify(payload) });

            if (!res.ok) throw new Error((await res.json()).error || "Save failed");
            onSaved();
        } catch (err: any) {
            setError(err.message);
            setSaving(false);
        }
    };

    const archive = async () => {
        if (!faq) return;
        if (!window.confirm("Archive this question? It stops showing on the homepage but is not deleted.")) return;
        setSaving(true);
        try {
            const res = await adminFetch(`/api/admin/content/faqs/${faq.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).error || "Archive failed");
            onSaved();
        } catch (err: any) {
            setError(err.message);
            setSaving(false);
        }
    };

    const currentStatus = faq?.status || "draft";

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />

            <aside className="relative w-full max-w-2xl bg-ink-900 border-l border-ink-600 h-full overflow-y-auto">
                <header className="sticky top-0 z-10 bg-ink-900 border-b border-ink-600 px-5 py-4 flex items-start gap-3">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <Badge tone={currentStatus === "published" ? "green" : "gold"}>{currentStatus}</Badge>
                            <span className="text-xs text-ink-500">shown on the homepage at /#qa</span>
                        </div>
                        <h2 className="text-base text-ink-100 font-medium truncate">
                            {isNew ? "New question" : pickLocale(question, "en") || "Edit question"}
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
                            const filled = Boolean(question[l]?.trim() && answer[l]?.trim());
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
                            <span className="text-[11px] text-ink-500 ml-auto">English shows when this is blank</span>
                        )}
                    </div>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs text-ink-400">Question</span>
                        <Input
                            value={question[locale] || ""}
                            onChange={(e) => setQuestion({ ...question, [locale]: e.target.value })}
                        />
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs text-ink-400">Answer</span>
                        <Textarea
                            rows={6}
                            value={answer[locale] || ""}
                            onChange={(e) => setAnswer({ ...answer, [locale]: e.target.value })}
                        />
                        <span className="text-[11px] text-ink-500">
                            Plain text. The accordion renders it as a paragraph, not Markdown.
                        </span>
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs text-ink-400">Order</span>
                        <Input value={order} onChange={(e) => setOrder(e.target.value)} inputMode="numeric" className="w-24" />
                    </label>

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
