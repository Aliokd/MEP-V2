"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, ArrowUpRight } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, PanelHeader, StatTile, Button, Badge, Spinner, EmptyState, timeAgo } from "./components/ui";

interface Overview {
    generatedAt: number;
    users: {
        total: number; signups24h: number; signups7d: number; signups30d: number;
        active24h: number; active7d: number; active30d: number;
        trial: number; pro: number; max: number; trialsExpiring7d: number;
    };
    content: { projectsTotal: number; projects7d: number; postsTotal: number; posts7d: number };
    inbox: { open: number; unread: number; feedbackOpen: number; supportOpen: number };
    moderation: { reportsOpen: number; reportsUrgent: number; moderatedPosts: number; sanctionsActive: number };
    recentAudit: { id: string; action: string; actorEmail: string; targetType: string; targetLabel: string; createdAt: number | null }[];
}

export default function AdminOverviewPage() {
    const { adminFetch, user } = useAdmin();
    const [data, setData] = useState<Overview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            const res = await adminFetch("/api/admin/overview");
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load overview");
            setData(await res.json());
        } catch (err: any) {
            setError(err.message || "Failed to load overview");
        } finally {
            setRefreshing(false);
        }
    }, [adminFetch]);

    useEffect(() => {
        load();
    }, [load]);

    const firstName = (user?.displayName || user?.email || "").split(/[\s@]/)[0];

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title={firstName ? `Good to see you, ${firstName}` : "Overview"}
                description="Everything happening across Veinote right now."
                action={
                    <div className="flex items-center gap-3">
                        {data && (
                            <span className="text-[11px] text-ink-500">Updated {timeAgo(data.generatedAt)}</span>
                        )}
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

            {!data && !error && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-24 rounded-2xl bg-ink-850 border border-ink-600" />
                    ))}
                </div>
            )}

            {data && (
                <>
                    {/* Things waiting on a human. These sit first on purpose — the
                        console's job is to make an unanswered person impossible to miss. */}
                    <section className="flex flex-col gap-3">
                        <h2 className="text-xs font-medium text-ink-400">Needs attention</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <StatTile
                                label="Unanswered messages"
                                value={data.inbox.open}
                                hint={`${data.inbox.unread} never opened`}
                                tone={data.inbox.unread > 0 ? "red" : "neutral"}
                                href="/admin/inbox"
                            />
                            <StatTile
                                label="Open reports"
                                value={data.moderation.reportsOpen}
                                hint={data.moderation.reportsUrgent > 0 ? `${data.moderation.reportsUrgent} urgent` : "nothing urgent"}
                                tone={data.moderation.reportsUrgent > 0 ? "red" : "neutral"}
                                href="/admin/reports"
                            />
                            <StatTile
                                label="Trials ending in 7 days"
                                value={data.users.trialsExpiring7d}
                                hint="conversion window"
                                href="/admin/users?filter=trial-expiring"
                            />
                            <StatTile
                                label="Active sanctions"
                                value={data.moderation.sanctionsActive}
                                hint={`${data.moderation.moderatedPosts} posts removed`}
                                href="/admin/community"
                            />
                        </div>
                    </section>

                    <section className="flex flex-col gap-3">
                        <h2 className="text-xs font-medium text-ink-400">People</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <StatTile label="Total accounts" value={data.users.total} hint={`+${data.users.signups30d} in 30 days`} />
                            <StatTile label="New today" value={data.users.signups24h} hint={`${data.users.signups7d} this week`} />
                            <StatTile label="Active today" value={data.users.active24h} hint={`${data.users.active7d} weekly, ${data.users.active30d} monthly`} />
                            <StatTile
                                label="Paid accounts"
                                value={data.users.pro + data.users.max}
                                hint={`${data.users.pro} Pro · ${data.users.max} Max · ${data.users.trial} trial`}
                            />
                        </div>
                    </section>

                    <section className="flex flex-col gap-3">
                        <h2 className="text-xs font-medium text-ink-400">Creation & community</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <StatTile label="Songs in progress" value={data.content.projectsTotal} hint={`+${data.content.projects7d} this week`} />
                            <StatTile label="Community posts" value={data.content.postsTotal} hint={`+${data.content.posts7d} this week`} href="/admin/community" />
                            {/* These tiles count unresolved threads, so they carry the
                                filter with them — the Inbox itself now opens on every
                                status, and landing on a different number than the tile
                                showed would read as a bug. */}
                            <StatTile label="Feedback threads" value={data.inbox.feedbackOpen} hint="open" href="/admin/inbox?source=feedback&status=unresolved" />
                            <StatTile label="Support tickets" value={data.inbox.supportOpen} hint="open" href="/admin/inbox?source=support&status=unresolved" />
                        </div>
                    </section>

                    <Panel>
                        <PanelHeader
                            title="Recent admin activity"
                            subtitle="Every action taken in this console is logged."
                            action={
                                <Link href="/admin/audit" className="text-xs text-ink-400 hover:text-ink-100 flex items-center gap-1 transition-colors">
                                    Full log <ArrowUpRight className="w-3 h-3" />
                                </Link>
                            }
                        />
                        {data.recentAudit.length === 0 ? (
                            <EmptyState title="No admin activity yet" description="Actions appear here as soon as the team starts working." />
                        ) : (
                            <ul className="divide-y divide-ink-600">
                                {data.recentAudit.map((entry) => (
                                    <li key={entry.id} className="flex items-center gap-3 px-5 py-3">
                                        <Badge tone="neutral">{entry.action}</Badge>
                                        <span className="text-sm text-ink-200 truncate flex-1 min-w-0">{entry.targetLabel}</span>
                                        <span className="text-xs text-ink-500 truncate hidden sm:block">{entry.actorEmail}</span>
                                        <span className="text-xs text-ink-500 shrink-0">{timeAgo(entry.createdAt)}</span>
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
