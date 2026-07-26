"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, Badge, Button, Select, EmptyState, SkeletonRows, Spinner, timeAgo } from "../components/ui";
import ReportDetail from "./ReportDetail";

export interface QueueItem {
    id: string;
    targetType: string;
    targetId: string;
    targetOwnerId: string | null;
    snapshot: Record<string, any>;
    openCount: number;
    totalCount: number;
    reasons: Record<string, number>;
    priority: string;
    status: string;
    resolution: string | null;
    handledByEmail: string | null;
    firstReportedAt: number | null;
    lastReportedAt: number | null;
    handledAt: number | null;
}

const PRIORITY_TONE: Record<string, "neutral" | "gold" | "red"> = {
    urgent: "red",
    high: "gold",
    normal: "neutral",
};

export default function ReportsPage() {
    const { adminFetch } = useAdmin();
    const [items, setItems] = useState<QueueItem[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [status, setStatus] = useState("open");
    const [selected, setSelected] = useState<QueueItem | null>(null);

    const load = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            const res = await adminFetch(`/api/admin/reports?status=${status}`);
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load reports");
            setItems((await res.json()).items);
        } catch (err: any) {
            setError(err.message);
            setItems([]);
        } finally {
            setRefreshing(false);
        }
    }, [adminFetch, status]);

    useEffect(() => {
        load();
    }, [load]);

    const urgent = items?.filter((i) => i.priority === "urgent").length || 0;

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Reports"
                description="One row per reported thing, however many people reported it. Urgent reasons — self-harm, threats — sort to the top automatically."
                action={
                    <div className="flex items-center gap-2">
                        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="open">Open</option>
                            <option value="closed">Closed</option>
                            <option value="escalated">Escalated</option>
                            <option value="all">All</option>
                        </Select>
                        <Button onClick={load} disabled={refreshing} size="sm">
                            {refreshing ? <Spinner className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Refresh
                        </Button>
                    </div>
                }
            />

            {urgent > 0 && (
                <Panel className="p-4 border-red-500/40 bg-red-500/5 flex items-center gap-3">
                    <TriangleAlert className="w-4 h-4 text-red-300 shrink-0" />
                    <p className="text-sm text-red-200">
                        {urgent} urgent {urgent === 1 ? "report" : "reports"} — someone may be at risk. Handle these first.
                    </p>
                </Panel>
            )}

            {error && (
                <Panel className="p-4 border-red-500/30">
                    <p className="text-sm text-red-300">{error}</p>
                </Panel>
            )}

            <Panel className="overflow-hidden">
                {!items ? (
                    <SkeletonRows rows={6} />
                ) : items.length === 0 ? (
                    <EmptyState
                        title="Queue is clear"
                        description="Nothing is waiting for a moderation decision."
                    />
                ) : (
                    <ul className="divide-y divide-ink-600">
                        {items.map((item) => (
                            <li key={item.id}>
                                <button
                                    onClick={() => setSelected(item)}
                                    className="w-full text-left px-4 py-3.5 hover:bg-ink-800 transition-colors flex flex-col gap-1.5"
                                >
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge tone={PRIORITY_TONE[item.priority] || "neutral"}>{item.priority}</Badge>
                                        <Badge tone="neutral">{item.targetType}</Badge>
                                        <span className="text-sm text-ink-100 truncate">
                                            {item.snapshot?.projectName || item.snapshot?.name || item.snapshot?.title || item.targetId}
                                        </span>
                                        {item.status === "reopened" && <Badge tone="gold">reopened</Badge>}
                                        <span className="text-xs text-ink-500 ml-auto shrink-0">{timeAgo(item.lastReportedAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-ink-500">
                                        <span className="text-ink-300">
                                            {item.openCount} open {item.openCount === 1 ? "report" : "reports"}
                                            {item.totalCount !== item.openCount && ` · ${item.totalCount} total`}
                                        </span>
                                        {Object.entries(item.reasons).map(([reason, n]) => (
                                            <span key={reason} className="px-1.5 py-0.5 rounded bg-ink-800 border border-ink-600">
                                                {reason.replace("_", " ")} ×{n as number}
                                            </span>
                                        ))}
                                        {item.snapshot?.author && <span className="ml-auto">by {item.snapshot.author}</span>}
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            {selected && (
                <ReportDetail item={selected} onClose={() => setSelected(null)} onChanged={load} />
            )}
        </div>
    );
}
