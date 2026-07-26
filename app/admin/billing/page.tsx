"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, PanelHeader, Badge, Button, StatTile, SkeletonRows, Spinner, EmptyState } from "../components/ui";

interface Billing {
    tiers: { trial: number; pro: number; max: number; none: number };
    statuses: Record<string, number>;
    paying: number;
    conversionRate: number;
    trialsExpiring7d: number;
    trialsLapsed: number;
    missingPaddleId: number;
    attention: { uid: string; email: string | null; tier: string | null; status: string | null; trialEndsAt: string | null; issue: string }[];
    note: string;
}

export default function BillingPage() {
    const { adminFetch } = useAdmin();
    const [data, setData] = useState<Billing | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            const res = await adminFetch("/api/admin/billing");
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load billing");
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

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Billing"
                description="What Veinote's own database believes about subscriptions."
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
                    <Panel className="p-3.5 flex gap-2.5 items-start">
                        <TriangleAlert className="w-3.5 h-3.5 text-ink-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-ink-400">{data.note}</p>
                    </Panel>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatTile label="Paying accounts" value={data.paying} hint={`${data.tiers.pro} Pro · ${data.tiers.max} Max`} />
                        <StatTile label="Trial → paid" value={`${data.conversionRate}%`} hint="of trials plus paying" />
                        <StatTile label="Trials ending in 7 days" value={data.trialsExpiring7d} hint="conversion window" />
                        <StatTile
                            label="Needs attention"
                            value={data.attention.length}
                            hint={`${data.trialsLapsed} lapsed · ${data.missingPaddleId} unlinked`}
                            tone={data.attention.length > 0 ? "red" : "neutral"}
                        />
                    </div>

                    <div className="grid gap-3 lg:grid-cols-3">
                        <Panel>
                            <PanelHeader title="Subscription status" />
                            {Object.keys(data.statuses).length === 0 ? (
                                <p className="p-5 text-sm text-ink-500">No subscription statuses recorded yet.</p>
                            ) : (
                                <ul className="divide-y divide-ink-600">
                                    {Object.entries(data.statuses).map(([status, count]) => (
                                        <li key={status} className="px-5 py-2.5 flex items-center justify-between text-sm">
                                            <span className="text-ink-300">{status}</span>
                                            <span className="text-ink-100 tabular-nums">{count}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>

                        <Panel className="lg:col-span-2 overflow-hidden">
                            <PanelHeader
                                title="Accounts needing attention"
                                subtitle="Where the tier, the trial date and the Paddle record disagree."
                            />
                            {data.attention.length === 0 ? (
                                <EmptyState title="Nothing out of place" description="Tiers and subscription records agree." />
                            ) : (
                                <ul className="divide-y divide-ink-600">
                                    {data.attention.map((row, i) => (
                                        <li key={`${row.uid}-${i}`} className="px-4 py-3 flex items-center gap-3">
                                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                                <span className="text-sm text-ink-100 truncate">{row.email || row.uid}</span>
                                                <span className="text-xs text-red-300">{row.issue}</span>
                                            </div>
                                            <Badge tone="neutral">{row.tier || "no tier"}</Badge>
                                            <a
                                                href={`/admin/users?uid=${row.uid}`}
                                                className="text-xs text-ink-400 hover:text-ink-100 shrink-0"
                                            >
                                                Open
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>
                    </div>
                </>
            )}
        </div>
    );
}
