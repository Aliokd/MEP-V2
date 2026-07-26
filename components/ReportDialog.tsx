"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { authedFetch } from "@/lib/authedFetch";
import { REPORT_REASONS, type ReportReason, type ReportTargetType } from "@/lib/reports";

interface ReportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    targetType: ReportTargetType;
    targetId: string;
    /** Required when reporting a comment, so the server can find its parent post. */
    postId?: string;
    /** What is being reported, shown back to the reporter for confirmation. */
    targetLabel?: string;
}

export default function ReportDialog({
    isOpen,
    onClose,
    targetType,
    targetId,
    postId,
    targetLabel,
}: ReportDialogProps) {
    const { t } = useLanguage();
    const [reason, setReason] = useState<ReportReason | null>(null);
    const [note, setNote] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (isOpen) {
            setReason(null);
            setNote("");
            setSent(false);
            setError("");
        }
    }, [isOpen]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        if (isOpen) window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    if (!isOpen || !mounted) return null;

    const submit = async () => {
        if (!reason) return;
        setSending(true);
        setError("");
        try {
            const res = await authedFetch("/api/reports", {
                method: "POST",
                body: JSON.stringify({ targetType, targetId, postId, reason, note: note.trim() || undefined }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || t("report.error"));
            setSent(true);
            setTimeout(onClose, 2200);
        } catch (err: any) {
            setError(err.message || t("report.error"));
        } finally {
            setSending(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white rounded-[22px] border border-stone-200 shadow-xl overflow-hidden">
                {sent ? (
                    <div className="p-8 flex flex-col items-center gap-3 text-center">
                        <div className="w-10 h-10 rounded-full bg-[#eaf5ec] flex items-center justify-center">
                            <Check className="w-5 h-5 text-[#2f6f40]" />
                        </div>
                        <h2 className="text-lg font-sans font-light text-stone-800">{t("report.sent_title")}</h2>
                        <p className="text-sm text-stone-500 leading-relaxed">{t("report.sent_body")}</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
                            <div className="flex flex-col gap-1 min-w-0">
                                <h2 className="text-lg font-sans font-light text-stone-800">{t("report.title")}</h2>
                                <p className="text-sm text-stone-500">{t("report.subtitle")}</p>
                                {targetLabel && (
                                    <p className="text-xs text-stone-400 truncate mt-1">{targetLabel}</p>
                                )}
                            </div>
                            <button onClick={onClose} className="text-stone-400 hover:text-stone-700 transition-colors shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="px-6 pb-4 flex flex-col gap-1.5 max-h-[45vh] overflow-y-auto">
                            {REPORT_REASONS.map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setReason(r)}
                                    className={`text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
                                        reason === r
                                            ? "border-[#86BE7F] bg-[#eaf5ec] text-stone-800"
                                            : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                                    }`}
                                >
                                    {t(`report.reason_${r}`)}
                                </button>
                            ))}
                        </div>

                        <div className="px-6 pb-4">
                            <textarea
                                rows={3}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder={t("report.note_placeholder")}
                                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 resize-none"
                            />
                        </div>

                        {error && <p className="px-6 pb-2 text-sm text-red-600">{error}</p>}

                        <div className="px-6 py-4 border-t border-stone-150 flex items-center justify-between gap-3">
                            <p className="text-[11px] text-stone-400 leading-snug flex-1">{t("report.privacy_note")}</p>
                            <button
                                onClick={submit}
                                disabled={!reason || sending}
                                className="shrink-0 px-5 py-2 rounded-full bg-[#86BE7F] text-stone-900 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
                            >
                                {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {t("report.submit")}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}
