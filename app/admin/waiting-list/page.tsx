"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, Badge, Button, EmptyState, SkeletonRows, Spinner, timeAgo } from "../components/ui";

interface WaitlistEntry {
    email: string;
    locale: string | null;
    source: string | null;
    position: number | null;
    signupCount: number;
    createdAt: number | null;
    invitedAt: number | null;
}

export default function WaitlistPage() {
    const { adminFetch } = useAdmin();

    const [entries, setEntries] = useState<WaitlistEntry[] | null>(null);
    // The real size of the list, which is not the length of the page shown.
    const [total, setTotal] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState(false);

    const load = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            const res = await adminFetch("/api/admin/waitlist");
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load the waitlist");
            const data = await res.json();
            setEntries(data.entries);
            setTotal(data.total ?? data.entries.length);
        } catch (err: any) {
            setError(err.message);
            setEntries([]);
        } finally {
            setRefreshing(false);
        }
    }, [adminFetch]);

    useEffect(() => {
        load();
    }, [load]);

    // The CSV route needs the bearer token, so it can't be a plain <a download>.
    // Fetch it, then hand the browser a blob URL to save.
    const exportCsv = async () => {
        setExporting(true);
        setError(null);
        try {
            const res = await adminFetch("/api/admin/waitlist?format=csv");
            if (!res.ok) throw new Error("Export failed");

            const url = URL.createObjectURL(await res.blob());
            const link = document.createElement("a");
            link.href = url;
            link.download = `veinote-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Waitlist"
                description="People who asked to be told when Veinote opens. Oldest first — that's the order to invite them in."
                action={
                    <div className="flex items-center gap-2">
                        <Button onClick={exportCsv} disabled={exporting || !entries?.length} size="sm">
                            {exporting ? <Spinner className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                            Export CSV
                        </Button>
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

            {entries && entries.length > 0 && (
                <p className="text-xs text-ink-500">
                    {total} {total === 1 ? "person" : "people"} waiting
                    {entries.length < total && ` · showing the first ${entries.length}`}
                </p>
            )}

            <Panel className="overflow-hidden">
                {!entries ? (
                    <SkeletonRows rows={8} />
                ) : entries.length === 0 ? (
                    <EmptyState
                        title="Nobody on the waitlist yet"
                        description="Signups land here the moment someone submits the form on /waitlist."
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[680px]">
                            <thead>
                                <tr className="text-left text-xs text-ink-500 border-b border-ink-600">
                                    <th className="font-medium px-4 py-2.5 w-16">#</th>
                                    <th className="font-medium px-4 py-2.5">Email</th>
                                    <th className="font-medium px-4 py-2.5">Language</th>
                                    <th className="font-medium px-4 py-2.5">From</th>
                                    <th className="font-medium px-4 py-2.5">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-600">
                                {entries.map((entry) => (
                                    <tr key={entry.email} className="hover:bg-ink-800 transition-colors">
                                        <td className="px-4 py-3 text-xs text-ink-500 tabular-nums">
                                            {entry.position ?? "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <a
                                                    href={`mailto:${entry.email}`}
                                                    className="text-ink-100 truncate hover:text-green-500 transition-colors"
                                                >
                                                    {entry.email}
                                                </a>
                                                {entry.signupCount > 1 && (
                                                    <Badge tone="neutral">{entry.signupCount}×</Badge>
                                                )}
                                                {entry.invitedAt && <Badge tone="green">invited</Badge>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-ink-400">{entry.locale || "—"}</td>
                                        <td className="px-4 py-3 text-xs text-ink-400">{entry.source || "—"}</td>
                                        <td className="px-4 py-3 text-xs text-ink-400">{timeAgo(entry.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>
        </div>
    );
}
