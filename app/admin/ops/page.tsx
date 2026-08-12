"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Power, Mail, Check, X as XIcon } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, PanelHeader, Badge, Button, SkeletonRows, Spinner, timeAgo } from "../components/ui";

interface Flag {
    id: string;
    label: string;
    enabled: boolean;
    reason: string | null;
    updatedByEmail: string | null;
    updatedAt: number | null;
}

export default function OpsPage() {
    const { adminFetch, can } = useAdmin();
    const [flags, setFlags] = useState<Flag[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const [mail, setMail] = useState<{
        config: { host: string; port: string; user: string; passwordSet: boolean };
        verified: boolean;
        error: string | null;
    } | null>(null);
    const [mailChecking, setMailChecking] = useState(false);
    const [mailTest, setMailTest] = useState<string | null>(null);
    const [mailTesting, setMailTesting] = useState(false);

    /** Opens an SMTP connection and authenticates, without sending anything. */
    const checkMail = useCallback(async () => {
        setMailChecking(true);
        setMailTest(null);
        try {
            const res = await adminFetch("/api/admin/ops/mail");
            if (!res.ok) throw new Error((await res.json()).error || "Check failed");
            setMail(await res.json());
        } catch (err: any) {
            setMail({
                config: { host: "?", port: "?", user: "?", passwordSet: false },
                verified: false,
                error: err.message,
            });
        } finally {
            setMailChecking(false);
        }
    }, [adminFetch]);

    /** Proves the whole path by sending a real message to the caller. */
    const sendTestMail = async () => {
        setMailTesting(true);
        setMailTest(null);
        try {
            const res = await adminFetch("/api/admin/ops/mail", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Send failed");
            setMailTest(`Sent to ${data.sentTo}. If it arrives, outbound email works.`);
        } catch (err: any) {
            setMailTest(err.message);
        } finally {
            setMailTesting(false);
        }
    };

    const load = useCallback(async () => {
        setError(null);
        try {
            const res = await adminFetch("/api/admin/flags");
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load flags");
            setFlags((await res.json()).flags);
        } catch (err: any) {
            setError(err.message);
            setFlags([]);
        }
    }, [adminFetch]);

    useEffect(() => {
        load();
        checkMail();
    }, [load, checkMail]);

    const toggle = async (flag: Flag) => {
        let reason = "";
        if (flag.enabled) {
            const input = window.prompt(
                `Switch off "${flag.label}"?\n\nCalls to this endpoint will return 503 until it's switched back on.\n\nWhy? (recorded in the audit log)`,
            );
            if (input === null) return;
            if (!input.trim()) {
                setError("A reason is required when switching something off.");
                return;
            }
            reason = input;
        }

        setBusyId(flag.id);
        setError(null);
        try {
            const res = await adminFetch("/api/admin/flags", {
                method: "PATCH",
                body: JSON.stringify({ flag: flag.id, enabled: !flag.enabled, reason }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Toggle failed");
            await load();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusyId(null);
        }
    };

    const off = flags?.filter((f) => !f.enabled) || [];

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Ops & flags"
                description="Kill switches for the AI endpoints and other features. Turning one off takes effect within 30 seconds, without a deploy."
                action={
                    <Button onClick={load} size="sm">
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </Button>
                }
            />

            {off.length > 0 && (
                <Panel className="p-4 border-gold-500/40 bg-gold-500/5">
                    <p className="text-sm text-gold-300">
                        {off.length} {off.length === 1 ? "feature is" : "features are"} currently switched off:{" "}
                        {off.map((f) => f.label).join(", ")}
                    </p>
                </Panel>
            )}

            {error && (
                <Panel className="p-4 border-red-500/30">
                    <p className="text-sm text-red-300">{error}</p>
                </Panel>
            )}

            {/* Email delivery. A failed notification only ever said "FAILED to
                send", which doesn't say which setting to change — this separates
                a missing password from a rejected login from an unreachable host. */}
            <Panel className="overflow-hidden">
                <PanelHeader
                    title="Email delivery"
                    subtitle="Every notification the platform sends — replies, removals, welcome mail — goes through this connection."
                    action={
                        <Button onClick={checkMail} disabled={mailChecking} size="sm">
                            {mailChecking ? <Spinner className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Re-check
                        </Button>
                    }
                />
                <div className="p-4 flex flex-col gap-3">
                    {!mail ? (
                        <div className="flex items-center gap-2 text-sm text-ink-400">
                            <Spinner className="w-3.5 h-3.5" /> Checking the mail server…
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Mail className="w-4 h-4 text-ink-500" />
                                {mail.verified ? (
                                    <Badge tone="green"><Check className="w-3 h-3" /> connected</Badge>
                                ) : (
                                    <Badge tone="red"><XIcon className="w-3 h-3" /> not working</Badge>
                                )}
                                <span className="text-xs text-ink-500 font-mono">
                                    {mail.config.user} → {mail.config.host}:{mail.config.port}
                                </span>
                                {!mail.config.passwordSet && <Badge tone="red">no password set</Badge>}
                            </div>

                            {mail.error && (
                                <div className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/30">
                                    <p className="text-sm text-red-200">{mail.error}</p>
                                </div>
                            )}

                            {mail.verified && (
                                <p className="text-xs text-ink-500">
                                    The login works and the server accepted the connection. If a specific message
                                    still fails, the problem is that message — a rejected recipient, say — not the
                                    configuration.
                                </p>
                            )}

                            {can("ops.write") && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Button onClick={sendTestMail} disabled={mailTesting} size="sm">
                                        {mailTesting ? <Spinner className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                                        Send a test to myself
                                    </Button>
                                    {mailTest && (
                                        <span
                                            className={`text-xs ${
                                                mailTest.startsWith("Sent to") ? "text-green-400" : "text-red-300"
                                            }`}
                                        >
                                            {mailTest}
                                        </span>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </Panel>

            <Panel className="overflow-hidden">
                <PanelHeader
                    title="Feature flags"
                    subtitle="Flags fail open — an unset flag, or Firestore being unreachable, leaves the feature on."
                />
                {!flags ? (
                    <SkeletonRows rows={6} />
                ) : (
                    <ul className="divide-y divide-ink-600">
                        {flags.map((flag) => (
                            <li key={flag.id} className="px-4 py-3.5 flex items-center gap-3">
                                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-ink-100">{flag.label}</span>
                                        <Badge tone={flag.enabled ? "green" : "red"}>{flag.enabled ? "on" : "off"}</Badge>
                                    </div>
                                    <span className="text-[11px] text-ink-500 font-mono">{flag.id}</span>
                                    {!flag.enabled && flag.reason && (
                                        <span className="text-xs text-gold-300 mt-1">{flag.reason}</span>
                                    )}
                                    {flag.updatedByEmail && (
                                        <span className="text-[11px] text-ink-600">
                                            changed {timeAgo(flag.updatedAt)} by {flag.updatedByEmail}
                                        </span>
                                    )}
                                </div>
                                {can("ops.write") && (
                                    <Button
                                        size="sm"
                                        variant={flag.enabled ? "danger" : "primary"}
                                        onClick={() => toggle(flag)}
                                        disabled={busyId === flag.id}
                                    >
                                        {busyId === flag.id ? <Spinner className="w-3 h-3" /> : <Power className="w-3.5 h-3.5" />}
                                        {flag.enabled ? "Switch off" : "Switch on"}
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
        </div>
    );
}
