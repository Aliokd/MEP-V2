"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Play, RefreshCw } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Panel, PanelHeader, Badge, Button, SkeletonRows, Spinner, timeAgo } from "../components/ui";

interface Candidate {
    uid: string;
    email: string | null;
    name: string | null;
    locale: string;
    trialEndsAt: string;
    reminderSentAt: string | null;
    skipReason: "sent" | "no-email" | "not-trial" | "card-trial" | null;
}

interface Status {
    flagEnabled: boolean;
    secretSet: boolean;
    schedule: { cron: string; timeZone: string; job: string; location: string };
    windowHours: number;
    lastRun: { at: string; trigger: string; flagEnabled: boolean; dryRun: boolean; candidates: number; sent: number; skipped: number; failures: { uid: string; error: string }[] } | null;
    upcoming: Candidate[];
    recent: { uid: string; email: string | null; sentAt: string; trialEndsAt: string | null }[];
}

const SKIP_LABEL: Record<NonNullable<Candidate["skipReason"]>, string> = {
    sent: "already sent",
    "no-email": "no address",
    "not-trial": "not on a trial any more",
    "card-trial": "card trial, Paddle reminds",
};

/**
 * The emails Veinote sends on its own clock, and the hands on them. One so
 * far: the day-before trial reminder. Its wording is edited under Templates;
 * this is where it is switched, watched and run early.
 */
export default function AutomationsTab() {
    const { adminFetch, can } = useAdmin();
    const [status, setStatus] = useState<Status | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [note, setNote] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        try {
            const res = await adminFetch("/api/admin/email/trial-reminders");
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load");
            setStatus(await res.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    }, [adminFetch]);

    useEffect(() => { load(); }, [load]);

    const runNow = async () => {
        const due = status?.upcoming.filter((c) => !c.skipReason).length ?? 0;
        if (!confirm(due === 0
            ? "Nobody is due a reminder right now. Run anyway? (Nothing will be sent.)"
            : `Send the reminder now to ${due} ${due === 1 ? "person" : "people"} whose trial ends within ${status?.windowHours} hours?`)) return;
        setRunning(true);
        setNote(null);
        try {
            const res = await adminFetch("/api/admin/email/trial-reminders", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Run failed");
            setNote(`Run finished: ${data.run.sent} sent, ${data.run.skipped} skipped${data.run.failures.length ? `, ${data.run.failures.length} failed` : ""}${data.run.flagEnabled ? "" : " (switch is off, so nothing was sent)"}.`);
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setRunning(false);
        }
    };

    if (!status && !error) return <SkeletonRows rows={4} />;

    const due = status?.upcoming.filter((c) => !c.skipReason) ?? [];

    return (
        <div className="flex flex-col gap-4">
            {error && (
                <Panel className="p-4 border-red-500/30"><p className="text-sm text-red-300">{error}</p></Panel>
            )}
            {note && (
                <Panel className="p-3.5"><p className="text-xs text-ink-300">{note}</p></Panel>
            )}

            {status && (
                <>
                    <Panel className="p-5 flex flex-col gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-ink-100">Trial ending reminder</span>
                            <Badge tone={status.flagEnabled ? "green" : "red"}>{status.flagEnabled ? "on" : "off"}</Badge>
                            {!status.secretSet && <Badge tone="gold">scheduler secret missing on this server</Badge>}
                            <div className="ml-auto flex items-center gap-2">
                                <Button size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5" /> Refresh</Button>
                                {can("announcements.send") && (
                                    <Button size="sm" variant="primary" onClick={runNow} disabled={running}>
                                        {running ? <Spinner className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />} Send now
                                    </Button>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-ink-400 leading-relaxed">
                            Goes once to anyone on a no-card trial ending within the next {status.windowHours} hours. Card trials get Paddle&apos;s own reminder instead.
                            Runs hourly (<span className="font-mono">{status.schedule.cron}</span>, {status.schedule.timeZone}) from Cloud Scheduler job <span className="font-mono">{status.schedule.job}</span>.
                            The wording is under <span className="text-ink-200">Templates › Trial ending reminder</span>; the switch is on the{" "}
                            <Link href="/admin/ops" className="text-ink-200 underline underline-offset-2">Ops page</Link> as <span className="font-mono">trial_reminders</span>.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <Fact label="Last run" value={status.lastRun ? `${timeAgo(Date.parse(status.lastRun.at))} (${status.lastRun.trigger})` : "never"} />
                            <Fact label="Last run sent" value={status.lastRun ? `${status.lastRun.sent} sent · ${status.lastRun.skipped} skipped` : "–"} tone={status.lastRun?.failures.length ? "red" : undefined} />
                            <Fact label="Due now" value={String(due.length)} />
                            <Fact label="In the window" value={String(status.upcoming.length)} />
                        </div>
                        {status.lastRun?.failures.length ? (
                            <ul className="text-xs text-red-300">
                                {status.lastRun.failures.map((f) => <li key={f.uid}>{f.uid}: {f.error}</li>)}
                            </ul>
                        ) : null}
                    </Panel>

                    <div className="grid gap-3 lg:grid-cols-2">
                        <Panel className="overflow-hidden">
                            <PanelHeader title="Trials ending in the window" subtitle="Who the next run will email, and who it will pass over." />
                            {status.upcoming.length === 0 ? (
                                <p className="p-5 text-sm text-ink-500">No trial ends in the next {status.windowHours} hours.</p>
                            ) : (
                                <ul className="divide-y divide-ink-600">
                                    {status.upcoming.map((c) => (
                                        <li key={c.uid} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-ink-100 truncate">{c.name || c.email || c.uid}</span>
                                                <span className="text-[11px] text-ink-500 truncate">{c.email} · ends {new Date(c.trialEndsAt).toLocaleString()} · {c.locale.toUpperCase()}</span>
                                            </div>
                                            {c.skipReason ? (
                                                <Badge tone="neutral">{SKIP_LABEL[c.skipReason]}</Badge>
                                            ) : (
                                                <Badge tone="gold"><Clock className="w-3 h-3" /> due</Badge>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>

                        <Panel className="overflow-hidden">
                            <PanelHeader title="Recently sent" subtitle="The last reminders that went out, newest first." />
                            {status.recent.length === 0 ? (
                                <p className="p-5 text-sm text-ink-500">None sent yet.</p>
                            ) : (
                                <ul className="divide-y divide-ink-600">
                                    {status.recent.map((r) => (
                                        <li key={r.uid} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                                            <span className="text-ink-100 truncate flex-1">{r.email || r.uid}</span>
                                            <span className="text-[11px] text-ink-500 shrink-0">{timeAgo(Date.parse(r.sentAt))}</span>
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

function Fact({ label, value, tone }: { label: string; value: string; tone?: "red" }) {
    return (
        <div className="rounded-xl bg-ink-800 border border-ink-600 px-3 py-2 flex flex-col gap-0.5">
            <span className="text-[11px] text-ink-500">{label}</span>
            <span className={tone === "red" ? "text-red-300" : "text-ink-200"}>{value}</span>
        </div>
    );
}
