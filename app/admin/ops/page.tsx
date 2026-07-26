"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Power } from "lucide-react";
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
    }, [load]);

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
