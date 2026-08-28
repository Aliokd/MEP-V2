"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, PanelHeader, Button, Select, StatTile, SkeletonRows, Spinner, timeAgo } from "../components/ui";

interface Analytics {
    windowDays: number;
    funnel: { step: string; count: number }[];
    recentlyActive: { uid: string; name: string | null; email: string | null; tier: string | null; lastActiveAt: string | null }[];
    cohorts: { week: string; signups: number; retained: number }[];
    byLocale: Record<string, number>;
    byTier: Record<string, number>;
    totals: { users: number; projects: number; posts: number };
}

export default function AnalyticsPage() {
    const { adminFetch } = useAdmin();
    const [data, setData] = useState<Analytics | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [days, setDays] = useState("30");
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            const res = await adminFetch(`/api/admin/analytics?days=${days}`);
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load analytics");
            setData(await res.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setRefreshing(false);
        }
    }, [adminFetch, days]);

    useEffect(() => {
        load();
    }, [load]);

    const top = data?.funnel[0]?.count || 0;

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Growth"
                description="Derived from account and project records rather than an event pipeline — good enough to steer by, and honest about what it measures."
                action={
                    <div className="flex items-center gap-2">
                        <Select value={days} onChange={(e) => setDays(e.target.value)}>
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="180">Last 180 days</option>
                        </Select>
                        <Button onClick={load} disabled={refreshing} size="sm">
                            {refreshing ? <Spinner className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Refresh
                        </Button>
                    </div>
                }
            />

            {error && (
                <Panel className="p-4 border-red-500/30">
                    <p className="text-sm text-red-300">{error}</p>
                </Panel>
            )}

            {!data ? (
                <SkeletonRows rows={6} />
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        <StatTile label="Total accounts" value={data.totals.users} />
                        <StatTile label="Songs started" value={data.totals.projects} />
                        <StatTile label="Community posts" value={data.totals.posts} />
                    </div>

                    <Panel>
                        <PanelHeader
                            title={`Funnel — accounts created in the last ${data.windowDays} days`}
                            subtitle="Each step is the same cohort, so the drop-off between rows is real."
                        />
                        <div className="p-5 flex flex-col gap-3">
                            {data.funnel.map((step, i) => {
                                const pct = top > 0 ? (step.count / top) * 100 : 0;
                                const prev = i > 0 ? data.funnel[i - 1].count : step.count;
                                const stepPct = prev > 0 ? (step.count / prev) * 100 : 0;
                                return (
                                    <div key={step.step} className="flex flex-col gap-1.5">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-sm text-ink-200">{step.step}</span>
                                            <span className="text-sm text-ink-100 tabular-nums ml-auto">{step.count}</span>
                                            {i > 0 && (
                                                <span className={`text-xs tabular-nums w-14 text-right ${stepPct < 30 ? "text-red-300" : "text-ink-500"}`}>
                                                    {Math.round(stepPct)}%
                                                </span>
                                            )}
                                        </div>
                                        <div className="h-2 rounded-full bg-ink-800 overflow-hidden">
                                            <div
                                                className="h-full bg-green-500/70 rounded-full transition-all"
                                                style={{ width: `${Math.max(pct, 0.5)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Panel>

                    <Panel>
                        <PanelHeader
                            title="Recently active"
                            subtitle="Latest platform visits, newest first. Accounts that never opened the app don't appear."
                        />
                        {(data.recentlyActive?.length ?? 0) === 0 ? (
                            <p className="p-5 text-sm text-ink-500">No activity recorded yet.</p>
                        ) : (
                            <ul className="divide-y divide-ink-600">
                                {data.recentlyActive.map((u) => (
                                    <li key={u.uid} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                                        <Link
                                            href={`/admin/users?q=${encodeURIComponent(u.uid)}`}
                                            className="text-ink-200 hover:text-ink-100 hover:underline truncate"
                                        >
                                            {u.name || u.email || u.uid}
                                        </Link>
                                        {u.tier && <span className="text-xs text-ink-500 shrink-0">{u.tier}</span>}
                                        <span className="text-ink-400 tabular-nums ml-auto shrink-0">{timeAgo(u.lastActiveAt)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>

                    <div className="grid gap-3 lg:grid-cols-2">
                        <Panel>
                            <PanelHeader title="Weekly cohorts" subtitle="Retained = still active more than a week after signing up." />
                            {data.cohorts.length === 0 ? (
                                <p className="p-5 text-sm text-ink-500">No signups in this window.</p>
                            ) : (
                                <ul className="divide-y divide-ink-600">
                                    {data.cohorts.map((c) => {
                                        const rate = c.signups > 0 ? Math.round((c.retained / c.signups) * 100) : 0;
                                        return (
                                            <li key={c.week} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                                                <span className="text-ink-400 tabular-nums">{c.week}</span>
                                                <span className="text-ink-200 tabular-nums ml-auto">{c.signups}</span>
                                                <span className={`tabular-nums w-12 text-right ${rate < 30 ? "text-red-300" : "text-green-400"}`}>
                                                    {rate}%
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Panel>

                        <div className="flex flex-col gap-3">
                            <Panel>
                                <PanelHeader title="By language" />
                                <ul className="divide-y divide-ink-600">
                                    {Object.entries(data.byLocale)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([locale, count]) => (
                                            <li key={locale} className="px-5 py-2.5 flex items-center justify-between text-sm">
                                                <span className="text-ink-300 uppercase">{locale}</span>
                                                <span className="text-ink-100 tabular-nums">{count}</span>
                                            </li>
                                        ))}
                                </ul>
                            </Panel>

                            <Panel>
                                <PanelHeader title="By tier" />
                                <ul className="divide-y divide-ink-600">
                                    {Object.entries(data.byTier)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([tier, count]) => (
                                            <li key={tier} className="px-5 py-2.5 flex items-center justify-between text-sm">
                                                <span className="text-ink-300">{tier}</span>
                                                <span className="text-ink-100 tabular-nums">{count}</span>
                                            </li>
                                        ))}
                                </ul>
                            </Panel>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
