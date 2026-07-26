"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, Badge, Button, Input, EmptyState, SkeletonRows, Spinner, timeAgo } from "../components/ui";

interface AuditEntry {
    id: string;
    action: string;
    actorEmail: string;
    actorRole: string;
    targetType: string;
    targetId: string;
    targetLabel: string;
    reason: string | null;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    ip: string | null;
    createdAt: number | null;
}

export default function AuditPage() {
    const { adminFetch } = useAdmin();
    const [entries, setEntries] = useState<AuditEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [actor, setActor] = useState("");
    const [expanded, setExpanded] = useState<string | null>(null);

    const load = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (actor.trim()) params.set("actor", actor.trim());
            const res = await adminFetch(`/api/admin/audit?${params}`);
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load audit log");
            setEntries((await res.json()).entries);
        } catch (err: any) {
            setError(err.message);
            setEntries([]);
        } finally {
            setRefreshing(false);
        }
    }, [adminFetch, actor]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Audit log"
                description="Every action taken in this console. Append-only — nobody, including a superadmin, can edit or delete an entry."
                action={
                    <Button onClick={load} disabled={refreshing} size="sm">
                        {refreshing ? <Spinner className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Refresh
                    </Button>
                }
            />

            <div className="relative max-w-sm">
                <Search className="w-3.5 h-3.5 text-ink-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                    value={actor}
                    onChange={(e) => setActor(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && load()}
                    placeholder="Filter by admin email, then press Enter"
                    className="pl-8"
                />
            </div>

            {error && (
                <Panel className="p-4 border-red-500/30">
                    <p className="text-sm text-red-300">{error}</p>
                </Panel>
            )}

            <Panel className="overflow-hidden">
                {!entries ? (
                    <SkeletonRows rows={8} />
                ) : entries.length === 0 ? (
                    <EmptyState title="No entries" description="Nothing has been logged for this filter." />
                ) : (
                    <ul className="divide-y divide-ink-600">
                        {entries.map((entry) => (
                            <li key={entry.id}>
                                <button
                                    onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                                    className="w-full text-left px-4 py-3 hover:bg-ink-800 transition-colors flex items-center gap-3"
                                >
                                    <Badge tone={entry.action.includes("delete") || entry.action.includes("ban") ? "red" : "neutral"}>
                                        {entry.action}
                                    </Badge>
                                    <span className="text-sm text-ink-200 truncate flex-1 min-w-0">{entry.targetLabel}</span>
                                    <span className="text-xs text-ink-500 truncate hidden md:block">{entry.actorEmail}</span>
                                    <span className="text-xs text-ink-500 shrink-0">{timeAgo(entry.createdAt)}</span>
                                </button>

                                {expanded === entry.id && (
                                    <div className="px-4 pb-4 flex flex-col gap-2 text-xs">
                                        {entry.reason && (
                                            <div className="p-3 rounded-xl bg-ink-800 border border-ink-600">
                                                <span className="text-ink-500">Reason given</span>
                                                <p className="text-ink-200 mt-1">{entry.reason}</p>
                                            </div>
                                        )}
                                        <div className="grid sm:grid-cols-2 gap-2">
                                            {entry.before && (
                                                <pre className="p-3 rounded-xl bg-ink-800 border border-ink-600 text-ink-400 overflow-x-auto">
                                                    before {JSON.stringify(entry.before, null, 2)}
                                                </pre>
                                            )}
                                            {entry.after && (
                                                <pre className="p-3 rounded-xl bg-ink-800 border border-ink-600 text-ink-400 overflow-x-auto">
                                                    after {JSON.stringify(entry.after, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                        <p className="text-ink-600">
                                            {entry.actorRole} · {entry.targetType}:{entry.targetId}
                                            {entry.ip && ` · ${entry.ip}`}
                                        </p>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
        </div>
    );
}
