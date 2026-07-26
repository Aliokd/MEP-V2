"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Trash2, Check, ArrowUpRight, TriangleAlert } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Badge, Button, Panel, Select, Spinner, Textarea, timeAgo } from "../components/ui";
import type { QueueItem } from "./page";

interface Detail {
    target: Record<string, any>;
    owner: {
        uid: string; name: string | null; email: string | null; tier: string | null;
        sanctionActive: boolean; priorSanctions: number; totalReportsAgainst: number;
    } | null;
    reports: { id: string; reason: string; note: string | null; reporterEmail: string | null; createdAt: number | null; priority: string }[];
}

export default function ReportDetail({
    item,
    onClose,
    onChanged,
}: {
    item: QueueItem;
    onClose: () => void;
    onChanged: () => void;
}) {
    const { adminFetch, can } = useAdmin();
    const [detail, setDetail] = useState<Detail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [reason, setReason] = useState("");
    const [sanctionType, setSanctionType] = useState("");

    const load = useCallback(async () => {
        try {
            const res = await adminFetch(`/api/admin/reports/${item.id}`);
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load report");
            setDetail(await res.json());
        } catch (err: any) {
            setError(err.message);
        }
    }, [adminFetch, item.id]);

    useEffect(() => {
        setDetail(null);
        load();
    }, [load]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const resolve = async (resolution: "dismissed" | "actioned" | "escalated") => {
        setBusy(true);
        setError(null);
        try {
            const res = await adminFetch(`/api/admin/reports/${item.id}`, {
                method: "PATCH",
                body: JSON.stringify({ resolution, reason }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to resolve");
            onChanged();
            onClose();
        } catch (err: any) {
            setError(err.message);
            setBusy(false);
        }
    };

    /** Remove the content, optionally sanction the author, then close the row. */
    const removeAndAction = async () => {
        if (!reason.trim()) {
            setError("A reason is required — it's sent to the author.");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            if (item.targetType === "post") {
                const res = await adminFetch("/api/admin/moderation/posts", {
                    method: "POST",
                    body: JSON.stringify({ postId: item.targetId, action: "remove", reason }),
                });
                if (!res.ok) throw new Error((await res.json()).error || "Failed to remove post");
            }

            if (sanctionType && detail?.owner?.uid) {
                const res = await adminFetch(`/api/admin/users/${detail.owner.uid}/sanction`, {
                    method: "POST",
                    body: JSON.stringify({ type: sanctionType, reason, relatedReportId: item.id }),
                });
                if (!res.ok) throw new Error((await res.json()).error || "Failed to sanction user");
            }

            await adminFetch(`/api/admin/reports/${item.id}`, {
                method: "PATCH",
                body: JSON.stringify({ resolution: "actioned", reason }),
            });

            onChanged();
            onClose();
        } catch (err: any) {
            setError(err.message);
            setBusy(false);
        }
    };

    const snapshot = detail?.target?.snapshot || item.snapshot || {};

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />

            <aside className="relative w-full max-w-2xl bg-ink-900 border-l border-ink-600 h-full overflow-y-auto">
                <header className="sticky top-0 z-10 bg-ink-900 border-b border-ink-600 px-5 py-4 flex items-start gap-3">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge tone={item.priority === "urgent" ? "red" : item.priority === "high" ? "gold" : "neutral"}>
                                {item.priority}
                            </Badge>
                            <Badge tone="neutral">{item.targetType}</Badge>
                            <Badge tone="neutral">{item.openCount} open</Badge>
                        </div>
                        <h2 className="text-base text-ink-100 font-medium truncate">
                            {snapshot.projectName || snapshot.title || snapshot.name || item.targetId}
                        </h2>
                        <p className="text-xs text-ink-500">
                            first reported {timeAgo(item.firstReportedAt)} · last {timeAgo(item.lastReportedAt)}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-ink-500 hover:text-ink-100 shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </header>

                {error && <p className="mx-5 mt-4 text-sm text-red-300">{error}</p>}

                {!detail ? (
                    <div className="p-16 flex justify-center"><Spinner className="w-5 h-5" /></div>
                ) : (
                    <div className="p-5 flex flex-col gap-5">
                        {item.priority === "urgent" && (
                            <Panel className="p-3.5 border-red-500/40 bg-red-500/5 flex gap-2.5">
                                <TriangleAlert className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-200 leading-relaxed">
                                    This was reported for self-harm or threats. If someone appears to be in danger,
                                    escalate rather than resolving it quietly — removal alone doesn&apos;t help the person.
                                </p>
                            </Panel>
                        )}

                        {/* The reported content */}
                        <Panel className="p-4 flex flex-col gap-2">
                            <span className="text-xs text-ink-400">Reported content</span>
                            {snapshot.author && <p className="text-xs text-ink-500">by {snapshot.author}</p>}
                            {snapshot.body && <p className="text-sm text-ink-200">{snapshot.body}</p>}
                            {Array.isArray(snapshot.lyrics) && snapshot.lyrics.length > 0 && (
                                <div className="p-3 rounded-xl bg-ink-800 border border-ink-600 flex flex-col gap-1">
                                    {snapshot.lyrics.map((line: string, i: number) => (
                                        <p key={i} className="text-sm text-ink-300">{line}</p>
                                    ))}
                                </div>
                            )}
                            {snapshot.comment && (
                                <div className="p-3 rounded-xl bg-ink-800 border border-ink-600">
                                    <p className="text-xs text-ink-500 mb-1">{snapshot.comment.author}</p>
                                    <p className="text-sm text-ink-200">{snapshot.comment.body}</p>
                                </div>
                            )}
                            {snapshot.attachment?.url && (
                                <a
                                    href={snapshot.attachment.url}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                                >
                                    {snapshot.attachment.name || "Attachment"} <ArrowUpRight className="w-3 h-3" />
                                </a>
                            )}
                        </Panel>

                        {/* Who posted it */}
                        {detail.owner && (
                            <Panel className="p-4 flex flex-col gap-2">
                                <span className="text-xs text-ink-400">Author</span>
                                <div className="flex items-center gap-2 flex-wrap text-sm">
                                    <span className="text-ink-100">{detail.owner.name || detail.owner.email}</span>
                                    <Badge tone={detail.owner.tier === "trial" ? "gold" : "green"}>{detail.owner.tier || "no tier"}</Badge>
                                    {detail.owner.sanctionActive && <Badge tone="red">currently sanctioned</Badge>}
                                </div>
                                <p className="text-xs text-ink-500">
                                    {detail.owner.priorSanctions} prior {detail.owner.priorSanctions === 1 ? "sanction" : "sanctions"} ·{" "}
                                    {detail.owner.totalReportsAgainst} total reports against them
                                </p>
                                <a
                                    href={`/admin/users?uid=${detail.owner.uid}`}
                                    className="text-xs text-ink-400 hover:text-ink-100 flex items-center gap-1 self-start"
                                >
                                    Open full profile <ArrowUpRight className="w-3 h-3" />
                                </a>
                            </Panel>
                        )}

                        {/* Individual reports */}
                        <Panel className="p-4 flex flex-col gap-2">
                            <span className="text-xs text-ink-400">
                                {detail.reports.length} {detail.reports.length === 1 ? "report" : "reports"}
                            </span>
                            {detail.reports.map((r) => (
                                <div key={r.id} className="p-3 rounded-xl bg-ink-800 border border-ink-600 flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <Badge tone={r.priority === "urgent" ? "red" : "neutral"}>{r.reason.replace("_", " ")}</Badge>
                                        <span className="text-[11px] text-ink-500 ml-auto">{timeAgo(r.createdAt)}</span>
                                    </div>
                                    {r.note && <p className="text-xs text-ink-300">{r.note}</p>}
                                </div>
                            ))}
                        </Panel>

                        {/* Decision */}
                        {can("reports.resolve") && (
                            <Panel className="p-4 flex flex-col gap-3 border-ink-500">
                                <span className="text-xs text-ink-400">Decision</span>
                                <Textarea
                                    rows={3}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Reason for the decision. If you remove the content, this exact text is emailed to the author."
                                />
                                {detail.owner && (
                                    <Select value={sanctionType} onChange={(e) => setSanctionType(e.target.value)}>
                                        <option value="">No sanction on the author</option>
                                        <option value="warn">Also warn the author</option>
                                        <option value="mute">Also mute for 7 days</option>
                                        <option value="suspend">Also suspend for 7 days</option>
                                        <option value="ban">Also ban permanently</option>
                                    </Select>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="danger" onClick={removeAndAction} disabled={busy || !reason.trim()}>
                                        {busy ? <Spinner className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        Remove content
                                    </Button>
                                    <Button onClick={() => resolve("dismissed")} disabled={busy}>
                                        <Check className="w-3.5 h-3.5" /> Dismiss — content stays
                                    </Button>
                                    <Button variant="ghost" onClick={() => resolve("escalated")} disabled={busy}>
                                        Escalate
                                    </Button>
                                </div>
                            </Panel>
                        )}
                    </div>
                )}
            </aside>
        </div>
    );
}
