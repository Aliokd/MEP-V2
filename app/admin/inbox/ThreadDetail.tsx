"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Send, Paperclip, StickyNote, ShieldAlert, ExternalLink } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Badge, Button, Select, Spinner, Textarea, timeAgo } from "../components/ui";
import type { InboxThread } from "./page";

interface Detail {
    thread: Record<string, any>;
    profile: Record<string, any> | null;
    notes: { id: string; body: string; authorName: string; createdAt: number | null }[];
    replies: { id: string; body: string; authorName: string; createdAt: number | null }[];
}

const CATEGORIES = ["bug", "billing", "feature request", "content", "account", "abuse", "other"];

/**
 * Canned openers, not canned answers — they save the typing that is identical
 * every time and leave the substance to the person replying.
 */
const CANNED: { label: string; body: string }[] = [
    {
        label: "Thanks + looking into it",
        body: "Thanks for writing in, and for taking the time to explain it clearly.\n\nI'm looking into this now and will come back to you as soon as I know more.",
    },
    {
        label: "Bug confirmed",
        body: "Thanks for reporting this — I've reproduced it on our side, so it's a real bug rather than something on your end.\n\nIt's on the list to fix and I'll let you know here once it ships.",
    },
    {
        label: "Need more detail",
        body: "Thanks for writing in. To track this down I need a little more detail:\n\n- Which browser and device were you on?\n- What were you doing right before it happened?\n- Does it happen every time, or just once?",
    },
    {
        label: "Fixed and live",
        body: "This is fixed and live now. Please reload Veinote and it should behave.\n\nThanks for flagging it — it's genuinely useful.",
    },
];

export default function ThreadDetail({
    thread,
    onClose,
    onChanged,
}: {
    thread: InboxThread;
    onClose: () => void;
    onChanged: () => void;
}) {
    const { adminFetch, can } = useAdmin();
    const [detail, setDetail] = useState<Detail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [reply, setReply] = useState("");
    const [note, setNote] = useState("");
    const [sending, setSending] = useState(false);
    const [savingNote, setSavingNote] = useState(false);

    const base = `/api/admin/inbox/${thread.source}/${thread.id}`;

    const load = useCallback(async () => {
        try {
            const res = await adminFetch(base);
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load thread");
            setDetail(await res.json());
        } catch (err: any) {
            setError(err.message);
        }
    }, [adminFetch, base]);

    useEffect(() => {
        setDetail(null);
        setError(null);
        load();
    }, [load]);

    // Escape closes the drawer — this is a keyboard-heavy queue.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const patch = async (body: Record<string, unknown>) => {
        const res = await adminFetch(base, { method: "PATCH", body: JSON.stringify(body) });
        if (!res.ok) {
            setError((await res.json()).error || "Update failed");
            return;
        }
        await load();
        onChanged();
    };

    const sendReply = async (resolve: boolean) => {
        if (!reply.trim()) return;
        setSending(true);
        setError(null);
        try {
            const res = await adminFetch(`${base}/reply`, {
                method: "POST",
                body: JSON.stringify({ message: reply, resolve }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to send reply");
            setReply("");
            await load();
            onChanged();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    };

    const addNote = async () => {
        if (!note.trim()) return;
        setSavingNote(true);
        try {
            const res = await adminFetch(`${base}/notes`, { method: "POST", body: JSON.stringify({ body: note }) });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to save note");
            setNote("");
            await load();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSavingNote(false);
        }
    };

    const t = detail?.thread;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />

            <aside className="relative w-full max-w-2xl bg-ink-900 border-l border-ink-600 h-full overflow-y-auto flex flex-col">
                <header className="sticky top-0 z-10 bg-ink-900 border-b border-ink-600 px-5 py-4 flex items-start gap-3">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge tone="neutral">{thread.source}</Badge>
                            {t && <Badge tone={t.status === "resolved" ? "green" : t.status === "new" ? "red" : "gold"}>{t.status}</Badge>}
                            {thread.verified === false && (
                                <Badge tone="gold"><ShieldAlert className="w-3 h-3" /> unverified sender</Badge>
                            )}
                        </div>
                        <h2 className="text-base text-ink-100 font-medium">{thread.subject}</h2>
                        <p className="text-xs text-ink-500">
                            {thread.userName} · {thread.userEmail} · {timeAgo(thread.createdAt)}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-ink-500 hover:text-ink-100 transition-colors shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </header>

                {error && <p className="mx-5 mt-4 text-sm text-red-300">{error}</p>}

                {!detail ? (
                    <div className="flex-1 flex items-center justify-center"><Spinner className="w-5 h-5" /></div>
                ) : (
                    <div className="flex flex-col gap-5 p-5">
                        {/* Who this is */}
                        {detail.profile && (
                            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-ink-850 border border-ink-600 text-xs text-ink-300">
                                <span className="text-ink-100 font-medium">{detail.profile.name || detail.profile.email}</span>
                                <Badge tone={detail.profile.tier === "trial" ? "gold" : "green"}>{detail.profile.tier || "no tier"}</Badge>
                                <span>joined {timeAgo(detail.profile.createdAt as number)}</span>
                                <span>last seen {timeAgo(detail.profile.lastActiveAt as number)}</span>
                                <a
                                    href={`/admin/users?uid=${detail.profile.uid}`}
                                    className="ml-auto flex items-center gap-1 text-ink-400 hover:text-ink-100"
                                >
                                    Open profile <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        )}

                        {/* Triage controls */}
                        <div className="flex flex-wrap gap-2">
                            <Select value={t?.status || "new"} onChange={(e) => patch({ status: e.target.value })}>
                                <option value="new">New</option>
                                <option value="open">Open</option>
                                <option value="pending">Pending</option>
                                <option value="resolved">Resolved</option>
                                <option value="closed">Closed</option>
                            </Select>
                            <Select value={t?.priority || "normal"} onChange={(e) => patch({ priority: e.target.value })}>
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </Select>
                            <Select value={t?.category || ""} onChange={(e) => patch({ category: e.target.value })}>
                                <option value="">No category</option>
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </Select>
                            {t?.assigneeUid ? (
                                <Button size="sm" variant="ghost" onClick={() => patch({ assign: null })}>
                                    Assigned to {t.assigneeName} — unassign
                                </Button>
                            ) : (
                                <Button size="sm" onClick={() => patch({ assign: "me" })}>Assign to me</Button>
                            )}
                        </div>

                        {/* The original message */}
                        <div className="flex flex-col gap-2">
                            <span className="text-xs text-ink-400">Message</span>
                            <div className="p-4 rounded-xl bg-ink-850 border border-ink-600">
                                <p className="text-sm text-ink-200 whitespace-pre-wrap leading-relaxed">{t?.message}</p>
                                {t?.attachmentUrl && (
                                    <a
                                        href={t.attachmentUrl}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className="mt-3 inline-flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300"
                                    >
                                        <Paperclip className="w-3 h-3" />
                                        {t.attachmentName || "Attachment"}
                                    </a>
                                )}
                            </div>
                            {t?.userAgent && <p className="text-[11px] text-ink-500 break-all">{t.userAgent}</p>}
                        </div>

                        {/* Conversation */}
                        {detail.replies.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <span className="text-xs text-ink-400">Replies sent</span>
                                {detail.replies.map((r) => (
                                    <div key={r.id} className="p-3.5 rounded-xl bg-green-500/5 border border-green-500/20">
                                        <p className="text-sm text-ink-200 whitespace-pre-wrap">{r.body}</p>
                                        <p className="text-[11px] text-ink-500 mt-2">
                                            {r.authorName} · {timeAgo(r.createdAt)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Reply box */}
                        {can("inbox.reply") && (
                            <div className="flex flex-col gap-2">
                                <span className="text-xs text-ink-400">Reply by email to {thread.userEmail}</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {CANNED.map((c) => (
                                        <button
                                            key={c.label}
                                            onClick={() => setReply(c.body)}
                                            className="text-[11px] px-2.5 py-1 rounded-full border border-ink-600 text-ink-400 hover:text-ink-100 hover:border-ink-500 transition-colors"
                                        >
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                                <Textarea
                                    rows={6}
                                    value={reply}
                                    onChange={(e) => setReply(e.target.value)}
                                    placeholder="Write a reply…"
                                />
                                <div className="flex items-center gap-2">
                                    <Button variant="primary" onClick={() => sendReply(false)} disabled={sending || !reply.trim()}>
                                        {sending ? <Spinner className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                                        Send
                                    </Button>
                                    <Button onClick={() => sendReply(true)} disabled={sending || !reply.trim()}>
                                        Send & resolve
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Internal notes */}
                        <div className="flex flex-col gap-2">
                            <span className="text-xs text-ink-400 flex items-center gap-1.5">
                                <StickyNote className="w-3 h-3" /> Internal notes — never sent to the user
                            </span>
                            {detail.notes.map((n) => (
                                <div key={n.id} className="p-3 rounded-xl bg-ink-850 border border-ink-600">
                                    <p className="text-sm text-ink-300 whitespace-pre-wrap">{n.body}</p>
                                    <p className="text-[11px] text-ink-500 mt-1.5">{n.authorName} · {timeAgo(n.createdAt)}</p>
                                </div>
                            ))}
                            <Textarea
                                rows={2}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Add a note for the team…"
                            />
                            <Button size="sm" onClick={addNote} disabled={savingNote || !note.trim()} className="self-start">
                                {savingNote ? <Spinner className="w-3 h-3" /> : null}
                                Add note
                            </Button>
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
}
