"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "@/context/AdminContext";
import { Panel, Spinner, timeAgo } from "../components/ui";

interface Activity {
    configured: boolean;
    error?: string;
    known?: boolean;
    lastSeenAt?: string | null;
    firstSeenAt?: string | null;
    sessions30d?: number;
    pageviews30d?: number;
    topPages?: { path: string; views: number }[];
    recent?: { event: string; at: string; path: string | null }[];
    firstTouch?: { source: string | null; medium: string | null; campaign: string | null; referrer: string | null };
}

/**
 * What PostHog holds on one account, fetched when the drawer opens. An
 * account that declined analytics is "unknown" here, which is the promise
 * the cookie bar makes, not a gap.
 */
export default function ActivityPanel({ uid }: { uid: string }) {
    const { adminFetch } = useAdmin();
    const [data, setData] = useState<Activity | null>(null);

    useEffect(() => {
        let cancelled = false;
        adminFetch(`/api/admin/users/${uid}/activity`)
            .then(async (res) => {
                const body = await res.json().catch(() => ({}));
                if (!cancelled) setData(res.ok ? body : { configured: true, error: body.error || "Could not read activity" });
            })
            .catch((err) => { if (!cancelled) setData({ configured: true, error: String(err) }); });
        return () => { cancelled = true; };
    }, [adminFetch, uid]);

    return (
        <Panel className="p-4 flex flex-col gap-2">
            <span className="text-xs text-ink-400">Activity (PostHog)</span>
            {!data ? (
                <div className="flex items-center gap-2 text-xs text-ink-500"><Spinner className="w-3.5 h-3.5" /> Reading…</div>
            ) : !data.configured ? (
                <p className="text-xs text-ink-500">Not connected. Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID on the server.</p>
            ) : data.error ? (
                <p className="text-xs text-red-300">{data.error}</p>
            ) : !data.known ? (
                <p className="text-xs text-ink-500">Nothing recorded under this account. They declined analytics, or have not opened the app since signing in.</p>
            ) : (
                <>
                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                        <div><dt className="text-ink-500">Last seen</dt><dd className="text-ink-200">{data.lastSeenAt ? timeAgo(Date.parse(data.lastSeenAt)) : "–"}</dd></div>
                        <div><dt className="text-ink-500">First seen</dt><dd className="text-ink-200">{data.firstSeenAt ? timeAgo(Date.parse(data.firstSeenAt)) : "–"}</dd></div>
                        <div><dt className="text-ink-500">Sessions, 30d</dt><dd className="text-ink-200 tabular-nums">{data.sessions30d ?? 0}</dd></div>
                        <div><dt className="text-ink-500">Pageviews, 30d</dt><dd className="text-ink-200 tabular-nums">{data.pageviews30d ?? 0}</dd></div>
                    </dl>
                    {data.firstTouch && (data.firstTouch.source || data.firstTouch.campaign || data.firstTouch.referrer) && (
                        <p className="text-[11px] text-ink-400">
                            First touch: {[data.firstTouch.source, data.firstTouch.medium, data.firstTouch.campaign, data.firstTouch.referrer].filter(Boolean).join(" · ")}
                        </p>
                    )}
                    {(data.topPages ?? []).length > 0 && (
                        <p className="text-[11px] text-ink-400">
                            Opens most: {data.topPages!.slice(0, 5).map((p) => `${p.path} (${p.views})`).join(", ")}
                        </p>
                    )}
                    {(data.recent ?? []).length > 0 && (
                        <ul className="mt-1 flex flex-col gap-0.5">
                            {data.recent!.map((e, i) => (
                                <li key={i} className="text-[11px] text-ink-400 flex gap-2">
                                    <span className="text-ink-600 shrink-0 w-16">{timeAgo(Date.parse(e.at))}</span>
                                    <span className="text-ink-300">{e.event}</span>
                                    {e.path && <span className="truncate">{e.path}</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </Panel>
    );
}
