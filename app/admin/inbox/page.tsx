"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Paperclip, ShieldAlert, RefreshCw } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, Badge, Button, Input, Select, EmptyState, SkeletonRows, Spinner, timeAgo } from "../components/ui";
import ThreadDetail from "./ThreadDetail";

export interface InboxThread {
    id: string;
    source: "feedback" | "support";
    userId: string;
    userName: string;
    userEmail: string;
    verified: boolean;
    subject: string;
    excerpt: string;
    status: string;
    priority: string;
    category: string | null;
    tags: string[];
    assigneeUid: string | null;
    assigneeName: string | null;
    resolvedByName: string | null;
    hasAttachment: boolean;
    replyCount: number;
    locale: string | null;
    createdAt: number | null;
    lastMessageAt: number | null;
    firstResponseAt: number | null;
    resolvedAt: number | null;
}

const STATUS_TONE: Record<string, "neutral" | "green" | "gold" | "red" | "blue"> = {
    new: "red",
    open: "gold",
    pending: "blue",
    resolved: "green",
    closed: "neutral",
};

const PRIORITY_TONE: Record<string, "neutral" | "green" | "gold" | "red" | "blue"> = {
    urgent: "red",
    high: "gold",
    normal: "neutral",
    low: "neutral",
};

// useSearchParams needs a Suspense boundary above it, otherwise the whole route
// is forced into client-side bailout at build time.
export default function InboxPage() {
    return (
        <Suspense fallback={<SkeletonRows rows={6} />}>
            <InboxQueue />
        </Suspense>
    );
}

function InboxQueue() {
    const { adminFetch } = useAdmin();
    const searchParams = useSearchParams();

    const [threads, setThreads] = useState<InboxThread[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [selected, setSelected] = useState<InboxThread | null>(null);

    const [source, setSource] = useState(searchParams.get("source") || "");
    // Every status by default. Opening on "unresolved" hid resolved threads, so
    // an admin couldn't see what a colleague had already answered without
    // knowing to change the filter first.
    const [status, setStatus] = useState(searchParams.get("status") || "");
    const [assignee, setAssignee] = useState("");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(search), 250);
        return () => clearTimeout(id);
    }, [search]);

    const load = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (source) params.set("source", source);
            if (status) params.set("status", status);
            if (assignee) params.set("assignee", assignee);
            if (debouncedSearch) params.set("q", debouncedSearch);

            const res = await adminFetch(`/api/admin/inbox?${params}`);
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load inbox");
            const data = await res.json();
            setThreads(data.threads);
        } catch (err: any) {
            setError(err.message || "Failed to load inbox");
            setThreads([]);
        } finally {
            setRefreshing(false);
        }
    }, [adminFetch, source, status, assignee, debouncedSearch]);

    useEffect(() => {
        load();
    }, [load]);

    const counts = useMemo(() => {
        if (!threads) return { total: 0, unread: 0, mine: 0 };
        return {
            total: threads.length,
            unread: threads.filter((t) => t.status === "new").length,
            mine: threads.filter((t) => t.assigneeUid).length,
        };
    }, [threads]);

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Inbox"
                description="Feedback and support tickets in one queue. Replies go out by email from support@veinote.com."
                action={
                    <Button onClick={load} disabled={refreshing} size="sm">
                        {refreshing ? <Spinner className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Refresh
                    </Button>
                }
            />

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="w-3.5 h-3.5 text-ink-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search subject, message, name or email"
                        className="pl-8"
                    />
                </div>
                <Select value={source} onChange={(e) => setSource(e.target.value)}>
                    <option value="">All sources</option>
                    <option value="feedback">Feedback</option>
                    <option value="support">Support</option>
                </Select>
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">Any status</option>
                    <option value="unresolved">Unresolved</option>
                    <option value="new">New</option>
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                </Select>
                <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                    <option value="">Anyone</option>
                    <option value="unassigned">Unassigned</option>
                </Select>
                {threads && (
                    <span className="text-xs text-ink-500 ml-auto">
                        {counts.total} shown · {counts.unread} never opened
                    </span>
                )}
            </div>

            {error && (
                <Panel className="p-4 border-red-500/30">
                    <p className="text-sm text-red-300">{error}</p>
                </Panel>
            )}

            <Panel className="overflow-hidden">
                {!threads ? (
                    <SkeletonRows rows={6} />
                ) : threads.length === 0 ? (
                    <EmptyState
                        title="Nothing here"
                        description="No threads match these filters. Feedback and support tickets land here the moment someone writes in."
                    />
                ) : (
                    <ul className="divide-y divide-ink-600">
                        {threads.map((thread) => (
                            <li key={`${thread.source}-${thread.id}`}>
                                <button
                                    onClick={() => setSelected(thread)}
                                    className="w-full text-left px-4 py-3.5 hover:bg-ink-800 transition-colors flex flex-col gap-1.5"
                                >
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge tone={STATUS_TONE[thread.status] || "neutral"}>{thread.status}</Badge>
                                        {thread.priority !== "normal" && (
                                            <Badge tone={PRIORITY_TONE[thread.priority]}>{thread.priority}</Badge>
                                        )}
                                        <Badge tone="neutral">{thread.source}</Badge>
                                        <span className="text-sm text-ink-100 font-medium truncate">{thread.subject}</span>
                                        {thread.hasAttachment && <Paperclip className="w-3 h-3 text-ink-500 shrink-0" />}
                                        {!thread.verified && (
                                            <span title="Identity not verified — the sender's ID token was missing or invalid">
                                                <ShieldAlert className="w-3 h-3 text-gold-400 shrink-0" />
                                            </span>
                                        )}
                                        <span className="text-xs text-ink-500 ml-auto shrink-0">
                                            {timeAgo(thread.lastMessageAt)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-ink-400 line-clamp-1">{thread.excerpt}</p>
                                    <div className="flex items-center gap-2 text-[11px] text-ink-500">
                                        <span className="truncate">{thread.userName} · {thread.userEmail}</span>
                                        {thread.locale && <span className="uppercase">{thread.locale}</span>}
                                        {thread.replyCount > 0 && <span>{thread.replyCount} replies</span>}
                                        {thread.resolvedByName && (thread.status === "resolved" || thread.status === "closed") ? (
                                            <span className="ml-auto text-green-400">Done by {thread.resolvedByName}</span>
                                        ) : thread.assigneeName ? (
                                            <span className="ml-auto">→ {thread.assigneeName}</span>
                                        ) : null}
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            {selected && (
                <ThreadDetail
                    thread={selected}
                    onClose={() => setSelected(null)}
                    onChanged={load}
                />
            )}
        </div>
    );
}
