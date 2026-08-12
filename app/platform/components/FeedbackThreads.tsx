"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
    fetchThreadReplies,
    markThreadRead,
    useFeedbackThreads,
    type ThreadReply,
    type UserThread,
} from "@/lib/useFeedbackThreads";

/**
 * The user's own side of the conversation: what they wrote in, and what the
 * team wrote back.
 *
 * Replies were already stored when an admin sent one — they just went out by
 * email and nowhere else, so a reply that landed in spam was simply lost. This
 * is the copy that can't get lost.
 */
export default function FeedbackThreads() {
    const { t, language } = useLanguage();
    const { threads, loading } = useFeedbackThreads();
    const [openId, setOpenId] = useState<string | null>(null);
    const [replies, setReplies] = useState<Record<string, ThreadReply[]>>({});
    const [loadingReplies, setLoadingReplies] = useState<string | null>(null);

    // Open the newest unread thread on arrival — that's what the dot was for.
    useEffect(() => {
        if (openId || threads.length === 0) return;
        const unread = threads.find((thread) => thread.unread);
        if (unread) setOpenId(`${unread.source}:${unread.id}`);
    }, [threads, openId]);

    const toggle = async (thread: UserThread) => {
        const key = `${thread.source}:${thread.id}`;
        if (openId === key) {
            setOpenId(null);
            return;
        }
        setOpenId(key);

        if (thread.unread) markThreadRead(thread.source, thread.id);

        if (!replies[key] && thread.replyCount > 0) {
            setLoadingReplies(key);
            try {
                const fetched = await fetchThreadReplies(thread.source, thread.id);
                setReplies((prev) => ({ ...prev, [key]: fetched }));
            } finally {
                setLoadingReplies(null);
            }
        }
    };

    const formatDate = (ms: number | null) =>
        ms ? new Date(ms).toLocaleDateString(language === "en" ? undefined : language) : "";

    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 text-stone-400 animate-spin" />
            </div>
        );
    }

    if (threads.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
                <p className="text-[15px] text-stone-600">{t("feedback_modal.no_messages")}</p>
                <p className="text-sm text-stone-400 max-w-xs">{t("feedback_modal.no_messages_hint")}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2.5">
            {threads.map((thread) => {
                const key = `${thread.source}:${thread.id}`;
                const isOpen = openId === key;
                const threadReplies = replies[key] || [];

                return (
                    <div
                        key={key}
                        className={`rounded-2xl border transition-colors ${
                            thread.unread ? "border-[#86BE7F]/50 bg-[#eaf5ec]/40" : "border-stone-200 bg-white"
                        }`}
                    >
                        <button
                            type="button"
                            onClick={() => toggle(thread)}
                            className="w-full text-left px-4 py-3.5 flex items-start gap-3"
                        >
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    {thread.unread && (
                                        <span className="w-2 h-2 rounded-full bg-[#86BE7F] shrink-0" />
                                    )}
                                    <span className="text-[15px] font-medium text-stone-800 truncate">
                                        {thread.subject}
                                    </span>
                                </div>
                                <span className="text-xs text-stone-400">
                                    {formatDate(thread.createdAt)}
                                    {thread.replyCount > 0
                                        ? ` · ${t("feedback_modal.replied")}`
                                        : ` · ${t("feedback_modal.awaiting_reply")}`}
                                </span>
                            </div>
                            <ChevronDown
                                className={`w-4 h-4 text-stone-400 shrink-0 mt-1 transition-transform ${
                                    isOpen ? "rotate-180" : ""
                                }`}
                            />
                        </button>

                        {isOpen && (
                            <div className="px-4 pb-4 flex flex-col gap-3">
                                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-150">
                                    <p className="text-[11px] text-stone-400 mb-1">
                                        {t("feedback_modal.you_wrote")}
                                    </p>
                                    <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                                        {thread.message}
                                    </p>
                                </div>

                                {loadingReplies === key && (
                                    <div className="flex justify-center py-3">
                                        <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />
                                    </div>
                                )}

                                {threadReplies.map((reply) => (
                                    <div
                                        key={reply.id}
                                        className="p-3.5 rounded-xl bg-[#eaf5ec] border border-[#d2ebda]"
                                    >
                                        <p className="text-[11px] text-[#2f6f40] mb-1">
                                            {t("feedback_modal.reply_from")} · {formatDate(reply.createdAt)}
                                        </p>
                                        <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                                            {reply.body}
                                        </p>
                                    </div>
                                ))}

                                {thread.replyCount === 0 && (
                                    <p className="text-xs text-stone-400 px-1">
                                        {t("feedback_modal.awaiting_reply_long")}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
