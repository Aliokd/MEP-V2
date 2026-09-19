"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { OFFBOARDING_REASONS, type OffboardingKind, type OffboardingRecord } from "@/lib/offboarding";
import { PageHeader, Panel, PanelHeader, Badge, Button, StatTile, SkeletonRows, Spinner, EmptyState, Select, timeAgo } from "../components/ui";

/** The console's own wording for each reason; the product's lives in the locales. */
const REASON_LABEL: Record<string, string> = {
    not_using: "Not using it enough",
    too_expensive: "Too expensive",
    missing_features: "Missing something they need",
    hard_to_use: "Hard to use",
    found_alternative: "Found another tool",
    finished: "Finished what they came for",
    other: "Something else",
};

interface Offboarding {
    rows: Array<OffboardingRecord & { id: string }>;
    totals: Record<OffboardingKind, { all: number; last30d: number }>;
    reasons: Record<OffboardingKind, Record<string, number>>;
    withNote: number;
    truncated: boolean;
    note: string;
}

/**
 * Offboarding: who cancelled, who deleted their account, and what they said
 * on the way out. Cancellations and deletions are tallied apart because they
 * ask different questions: a cancellation is about price and value, a
 * deletion is about the whole product.
 */
export default function OffboardingPage() {
    const { adminFetch } = useAdmin();
    const [data, setData] = useState<Offboarding | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [kind, setKind] = useState<"" | OffboardingKind>("");

    const load = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            const res = await adminFetch("/api/admin/offboarding");
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load offboarding");
            setData(await res.json());
        } catch (err: any) {
            setError(err.message);
        } finally {
            setRefreshing(false);
        }
    }, [adminFetch]);

    useEffect(() => {
        load();
    }, [load]);

    const rows = data ? data.rows.filter((row) => !kind || row.kind === kind) : [];
    const topReason = (tally: Record<string, number>) => {
        const [reason, count] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
        return count > 0 ? `${REASON_LABEL[reason] ?? reason} (${count})` : "no reasons given yet";
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Offboarding"
                description="Who cancelled, who deleted their account, and what they told us on the way out."
                action={
                    <Button onClick={load} disabled={refreshing} size="sm">
                        {refreshing ? <Spinner className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Refresh
                    </Button>
                }
            />

            {error && (
                <Panel className="p-4 border-red-500/30">
                    <p className="text-sm text-red-300">{error}</p>
                </Panel>
            )}

            {!data ? (
                <SkeletonRows rows={5} />
            ) : (
                <>
                    {data.truncated && (
                        <Panel className="p-3.5 flex gap-2.5 items-start">
                            <TriangleAlert className="w-3.5 h-3.5 text-ink-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-ink-400">{data.note}</p>
                        </Panel>
                    )}

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatTile label="Cancellations, 30 days" value={data.totals.cancel.last30d} hint={`${data.totals.cancel.all} in all`} />
                        <StatTile
                            label="Accounts deleted, 30 days"
                            value={data.totals.delete.last30d}
                            hint={`${data.totals.delete.all} in all`}
                            tone={data.totals.delete.last30d > 0 ? "red" : "neutral"}
                        />
                        <StatTile label="Top reason to cancel" value={topReason(data.reasons.cancel)} />
                        <StatTile label="Top reason to delete" value={topReason(data.reasons.delete)} />
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                        <ReasonPanel title="Why people cancel" tally={data.reasons.cancel} total={data.totals.cancel.all} />
                        <ReasonPanel title="Why people delete their account" tally={data.reasons.delete} total={data.totals.delete.all} />
                    </div>

                    <Panel className="overflow-hidden">
                        <PanelHeader
                            title="Departures"
                            subtitle={`${data.withNote} left a note.`}
                            action={
                                <Select value={kind} onChange={(e) => setKind(e.target.value as "" | OffboardingKind)}>
                                    <option value="">Cancellations and deletions</option>
                                    <option value="cancel">Cancellations</option>
                                    <option value="delete">Deletions</option>
                                </Select>
                            }
                        />
                        {rows.length === 0 ? (
                            <EmptyState title="Nobody has left this way yet" description="Cancellations and deletions from Settings land here." />
                        ) : (
                            <ul className="divide-y divide-ink-600">
                                {rows.map((row) => (
                                    <li key={row.id} className="px-4 py-3 flex flex-col gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge tone={row.kind === "delete" ? "red" : "gold"}>{row.kind === "delete" ? "Deleted account" : "Cancelled"}</Badge>
                                            <span className="text-sm text-ink-100 truncate">{row.email || row.name || row.uid}</span>
                                            <span className="text-xs text-ink-500">
                                                {row.tier || "no tier"}
                                                {row.plan ? ` · ${row.plan}` : ""}
                                                {row.accountAgeDays !== null ? ` · ${row.accountAgeDays} days in` : ""}
                                                {row.kind === "delete" ? ` · ${row.songs} song${row.songs === 1 ? "" : "s"}` : ""}
                                            </span>
                                            {row.subscriptionCancelled === false && (
                                                <Badge tone="red">subscription still running</Badge>
                                            )}
                                            <span className="text-xs text-ink-500 ml-auto">{timeAgo(row.createdAt)}</span>
                                        </div>
                                        {row.reasons.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {row.reasons.map((reason) => (
                                                    <Badge key={reason} tone="neutral">{REASON_LABEL[reason] ?? reason}</Badge>
                                                ))}
                                            </div>
                                        )}
                                        {row.note && <p className="text-sm text-ink-300 whitespace-pre-wrap">{row.note}</p>}
                                        {row.kind === "cancel" && (
                                            <a href={`/admin/users?uid=${row.uid}`} className="text-xs text-ink-400 hover:text-ink-100 self-start">
                                                Open user
                                            </a>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </>
            )}
        </div>
    );
}

function ReasonPanel({ title, tally, total }: { title: string; tally: Record<string, number>; total: number }) {
    const max = Math.max(1, ...Object.values(tally));
    return (
        <Panel>
            <PanelHeader title={title} subtitle={total === 0 ? "Nothing yet." : `${total} in all; several reasons can be given at once.`} />
            <ul className="px-5 py-3 flex flex-col gap-2.5">
                {OFFBOARDING_REASONS.map((reason) => {
                    const count = tally[reason] ?? 0;
                    return (
                        <li key={reason} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-ink-300">{REASON_LABEL[reason]}</span>
                                <span className="text-ink-100 tabular-nums">{count}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-ink-700 overflow-hidden">
                                <div className="h-full rounded-full bg-[#86BE7F]" style={{ width: `${(count / max) * 100}%` }} />
                            </div>
                        </li>
                    );
                })}
            </ul>
        </Panel>
    );
}
