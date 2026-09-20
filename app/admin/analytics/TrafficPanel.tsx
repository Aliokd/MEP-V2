"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "@/context/AdminContext";
import { Panel, PanelHeader, StatTile, SkeletonRows } from "../components/ui";

interface Traffic {
    configured: boolean;
    error?: string;
    windowDays?: number;
    visitors?: number;
    pageviews?: number;
    sessions?: number;
    daily?: { day: string; visitors: number; pageviews: number }[];
    topPages?: { path: string; views: number; visitors: number }[];
    sources?: { source: string; visitors: number }[];
    campaigns?: { campaign: string; visitors: number }[];
    funnel?: { step: string; people: number }[];
}

/**
 * The part of growth that happens before an account exists: visits, where
 * they came from, and how far into onboarding they got. Read from PostHog
 * through /api/admin/analytics/traffic; the account-side funnel above it
 * stays on Firestore, so the two can be read against each other.
 */
export default function TrafficPanel({ days }: { days: string }) {
    const { adminFetch } = useAdmin();
    const [data, setData] = useState<Traffic | null>(null);
    const [error, setError] = useState<string | null>(null);
    // A new window resets the view through the key on the parent, not by
    // clearing state inside the effect; see the `key` where this is mounted.

    useEffect(() => {
        let cancelled = false;
        adminFetch(`/api/admin/analytics/traffic?days=${days}`)
            .then(async (res) => {
                const body = await res.json().catch(() => ({}));
                if (cancelled) return;
                if (!res.ok) setError(body.error || "Could not read traffic");
                setData(body);
            })
            .catch((err) => { if (!cancelled) setError(String(err)); });
        return () => { cancelled = true; };
    }, [adminFetch, days]);

    if (!data && !error) return <SkeletonRows rows={3} />;

    if (data && !data.configured) {
        return (
            <Panel className="p-4">
                <p className="text-sm text-ink-300">Traffic is not connected.</p>
                <p className="text-xs text-ink-500 mt-1">
                    Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID on the server (repository secrets) and visits, sources and the onboarding funnel appear here.
                </p>
            </Panel>
        );
    }

    if (error || !data) {
        return (
            <Panel className="p-4 border-red-500/30">
                <p className="text-sm text-red-300">Traffic could not be read: {error}</p>
            </Panel>
        );
    }

    const peak = Math.max(1, ...(data.daily ?? []).map((d) => d.visitors));
    const funnelTop = data.funnel?.[0]?.people ?? 0;

    return (
        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-3">
                <StatTile label="Visitors" value={data.visitors ?? 0} hint={`last ${data.windowDays} days`} />
                <StatTile label="Sessions" value={data.sessions ?? 0} />
                <StatTile label="Pageviews" value={data.pageviews ?? 0} />
            </div>

            <Panel>
                <PanelHeader title="Visitors per day" subtitle="Every visitor counts, before any cookie choice: the anonymous tier carries pageviews." />
                <div className="p-5 flex items-end gap-[3px] h-28">
                    {(data.daily ?? []).map((d) => (
                        <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d.day}: ${d.visitors} visitors, ${d.pageviews} views`}>
                            <div className="w-full rounded-t bg-green-500/70" style={{ height: `${Math.max(2, (d.visitors / peak) * 100)}%` }} />
                        </div>
                    ))}
                    {(data.daily ?? []).length === 0 && <p className="text-xs text-ink-500">No visits in this window.</p>}
                </div>
            </Panel>

            <div className="grid gap-3 lg:grid-cols-3">
                <Panel>
                    <PanelHeader title="Before signup" subtitle="Unique people at each step, from the browser's own events." />
                    <div className="p-5 flex flex-col gap-3">
                        {(data.funnel ?? []).map((step, i) => {
                            const pct = funnelTop > 0 ? (step.people / funnelTop) * 100 : 0;
                            const prev = i > 0 ? data.funnel![i - 1].people : step.people;
                            const stepPct = prev > 0 ? (step.people / prev) * 100 : 0;
                            return (
                                <div key={step.step} className="flex flex-col gap-1.5">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-sm text-ink-200">{step.step}</span>
                                        <span className="text-sm text-ink-100 tabular-nums ml-auto">{step.people}</span>
                                        {i > 0 && (
                                            <span className={`text-xs tabular-nums w-12 text-right ${stepPct < 30 ? "text-red-300" : "text-ink-500"}`}>
                                                {Math.round(stepPct)}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="h-2 rounded-full bg-ink-800 overflow-hidden">
                                        <div className="h-full bg-green-500/70 rounded-full" style={{ width: `${Math.max(pct, 0.5)}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Panel>

                <Panel>
                    <PanelHeader title="Sources" subtitle="utm_source, or the referring site when a visit carried no tags." />
                    <List rows={(data.sources ?? []).map((s) => [s.source, s.visitors])} empty="No sources yet." />
                    {(data.campaigns ?? []).length > 0 && (
                        <>
                            <PanelHeader title="Campaigns" />
                            <List rows={data.campaigns!.map((c) => [c.campaign, c.visitors])} empty="" />
                        </>
                    )}
                </Panel>

                <Panel>
                    <PanelHeader title="Top pages" />
                    <List rows={(data.topPages ?? []).map((p) => [p.path, p.views])} empty="No pageviews yet." />
                </Panel>
            </div>
        </div>
    );
}

function List({ rows, empty }: { rows: [string, number][]; empty: string }) {
    if (rows.length === 0) return empty ? <p className="p-5 text-sm text-ink-500">{empty}</p> : null;
    return (
        <ul className="divide-y divide-ink-600">
            {rows.map(([label, n]) => (
                <li key={label} className="px-5 py-2 flex items-center justify-between text-sm gap-3">
                    <span className="text-ink-300 truncate">{label}</span>
                    <span className="text-ink-100 tabular-nums shrink-0">{n}</span>
                </li>
            ))}
        </ul>
    );
}
