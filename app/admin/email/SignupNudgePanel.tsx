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
    createdAt: string;
    lastStep: string | null;
    source: string | null;
    nudgeSentAt: string | null;
    skipReason: "sent" | "finished" | "has-card" | "opted-out" | "no-email" | "too-new" | null;
}

interface Status {
    flagEnabled: boolean;
    secretSet: boolean;
    schedule: { cron: string; timeZone: string; job: string };
    afterHours: number;
    untilHours: number;
    lastRun: { at: string; trigger: string; flagEnabled: boolean; sent: number; skipped: number; failures: { uid: string; error: string }[] } | null;
    candidates: Candidate[];
    outcomes: { sent: number; returned: number; paid: number };
}

const SKIP: Record<Exclude<Candidate["skipReason"], null>, { label: string; tone: "neutral" | "gold" | "green" }> = {
    sent: { label: "reminded", tone: "green" },
    finished: { label: "finished", tone: "green" },
    "has-card": { label: "has a card", tone: "green" },
    "opted-out": { label: "opted out", tone: "neutral" },
    "no-email": { label: "no address", tone: "neutral" },
    "too-new": { label: "less than a day old", tone: "neutral" },
};

const STEP_LABEL: Record<string, string> = { verdict: "the verdict", offer: "the offer", paywall: "the plans" };

/**
 * The day-after reminder to people who typed their email into onboarding
 * and left before the card. Wording lives under Templates; the switch is
 * the `signup_nudges` flag on the Ops page.
 */
export default function SignupNudgePanel() {
    const { adminFetch, can } = useAdmin();
    const [status, setStatus] = useState<Status | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [note, setNote] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        try {
            const res = await adminFetch("/api/admin/email/signup-nudges");
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load");
            setStatus(await res.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    }, [adminFetch]);

    useEffect(() => { load(); }, [load]);

    const due = status?.candidates.filter((c) => c.skipReason === null) ?? [];

    const runNow = async () => {
        if (!confirm(due.length === 0
            ? "Nobody is due this reminder right now. Run anyway? (Nothing will be sent.)"
            : `Send the reminder now to ${due.length} ${due.length === 1 ? "person" : "people"} who stopped after the email step?`)) return;
        setRunning(true);
        setNote(null);
        try {
            const res = await adminFetch("/api/admin/email/signup-nudges", { method: "POST" });
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

    if (!status && !error) return <SkeletonRows rows={3} />;

    return (
        <div className="flex flex-col gap-3">
            {error && <Panel className="p-4 border-red-500/30"><p className="text-sm text-red-300">{error}</p></Panel>}
            {note && <Panel className="p-3.5"><p className="text-xs text-ink-300">{note}</p></Panel>}

            {status && (
                <>
                    <Panel className="p-5 flex flex-col gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-ink-100">Unfinished signup reminder</span>
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
                            Goes once to anyone who typed their email into onboarding and left before adding a card, {status.afterHours} hours later (up to {Math.round(status.untilHours / 24)} days).
                            It lists what Veinote gives them, says the trial is free with a card, and its button is a one-time link that puts them back at the step they stopped on, answers saved, with no code to type.
                            Runs hourly (<span className="font-mono">{status.schedule.cron}</span>, {status.schedule.timeZone}) from Cloud Scheduler job <span className="font-mono">{status.schedule.job}</span>.
                            Wording under <span className="text-ink-200">Templates › Unfinished signup reminder</span>; switch on the{" "}
                            <Link href="/admin/ops" className="text-ink-200 underline underline-offset-2">Ops page</Link> as <span className="font-mono">signup_nudges</span>.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <Fact label="Last run" value={status.lastRun ? `${timeAgo(Date.parse(status.lastRun.at))} (${status.lastRun.trigger})` : "never"} />
                            <Fact label="Due now" value={String(due.length)} />
                            <Fact label="Reminded, all time" value={String(status.outcomes.sent)} />
                            <Fact label="Came back / added a card" value={`${status.outcomes.returned} / ${status.outcomes.paid}`} />
                        </div>
                        {status.lastRun?.failures.length ? (
                            <ul className="text-xs text-red-300">
                                {status.lastRun.failures.map((f) => <li key={f.uid}>{f.uid}: {f.error}</li>)}
                            </ul>
                        ) : null}
                    </Panel>

                    <Panel className="overflow-hidden">
                        <PanelHeader title="Unfinished signups, last 7 days" subtitle="Everyone who stopped after the email step, and what the next run will do with them." />
                        {status.candidates.length === 0 ? (
                            <p className="p-5 text-sm text-ink-500">No unfinished signups this week.</p>
                        ) : (
                            <ul className="divide-y divide-ink-600">
                                {status.candidates.map((c) => (
                                    <li key={c.uid} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <a href={`/admin/users?uid=${c.uid}`} className="text-ink-100 truncate hover:underline">{c.email || c.uid}</a>
                                            <span className="text-[11px] text-ink-500 truncate">
                                                signed up {timeAgo(Date.parse(c.createdAt))}
                                                {c.lastStep ? ` · stopped at ${STEP_LABEL[c.lastStep] ?? c.lastStep}` : " · stopped before the verdict"}
                                                {c.source ? ` · from ${c.source}` : ""} · {c.locale.toUpperCase()}
                                            </span>
                                        </div>
                                        {c.skipReason ? (
                                            <Badge tone={SKIP[c.skipReason].tone}>{SKIP[c.skipReason].label}</Badge>
                                        ) : (
                                            <Badge tone="gold"><Clock className="w-3 h-3" /> due</Badge>
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

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-ink-800 border border-ink-600 px-3 py-2 flex flex-col gap-0.5">
            <span className="text-[11px] text-ink-500">{label}</span>
            <span className="text-ink-200">{value}</span>
        </div>
    );
}
