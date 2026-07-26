"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, Trash2, RefreshCw } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, PanelHeader, Badge, Button, Input, Select, SkeletonRows, Spinner, timeAgo } from "../components/ui";
import { ADMIN_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_PERMISSIONS, type AdminRole } from "@/lib/admin/roles";

interface AdminRow {
    uid: string;
    email: string | null;
    name: string | null;
    role: AdminRole;
    disabled: boolean;
    grantedBy: string | null;
    grantedAt: number | null;
}

export default function TeamPage() {
    const { adminFetch, user } = useAdmin();
    const [admins, setAdmins] = useState<AdminRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<AdminRole>("support");

    const load = useCallback(async () => {
        setError(null);
        try {
            const res = await adminFetch("/api/admin/roles");
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load admins");
            setAdmins((await res.json()).admins);
        } catch (err: any) {
            setError(err.message);
            setAdmins([]);
        }
    }, [adminFetch]);

    useEffect(() => {
        load();
    }, [load]);

    const grant = async () => {
        if (!email.trim()) return;
        setBusy(true);
        setError(null);
        try {
            const res = await adminFetch("/api/admin/roles", {
                method: "POST",
                body: JSON.stringify({ email: email.trim(), role }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to grant role");
            setEmail("");
            await load();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const revoke = async (row: AdminRow) => {
        if (!window.confirm(`Revoke admin access for ${row.email}?`)) return;
        setBusy(true);
        setError(null);
        try {
            const res = await adminFetch(`/api/admin/roles?uid=${row.uid}`, { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to revoke");
            await load();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Admin team"
                description="Who can get into this console and what they can do. Role changes take effect on the person's next request — their existing session is revoked immediately."
                action={
                    <Button onClick={load} size="sm">
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </Button>
                }
            />

            {error && (
                <Panel className="p-4 border-red-500/30">
                    <p className="text-sm text-red-300">{error}</p>
                </Panel>
            )}

            <Panel>
                <PanelHeader title="Grant access" subtitle="The person must have signed in to Veinote at least once." />
                <div className="p-4 flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[220px]">
                        <Input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="their@email.com"
                            type="email"
                        />
                    </div>
                    <Select value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
                        {ADMIN_ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                    </Select>
                    <Button variant="primary" onClick={grant} disabled={busy || !email.trim()}>
                        {busy ? <Spinner className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                        Grant
                    </Button>
                </div>
                <p className="px-4 pb-4 text-xs text-ink-500">{ROLE_DESCRIPTIONS[role]}</p>
            </Panel>

            <Panel className="overflow-hidden">
                <PanelHeader title="Current admins" />
                {!admins ? (
                    <SkeletonRows rows={3} />
                ) : (
                    <ul className="divide-y divide-ink-600">
                        {admins.map((row) => (
                            <li key={row.uid} className="px-4 py-3 flex items-center gap-3">
                                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-ink-100 truncate">{row.name || row.email}</span>
                                        {row.uid === user?.uid && <Badge tone="green">you</Badge>}
                                        {row.disabled && <Badge tone="red">disabled</Badge>}
                                    </div>
                                    <span className="text-xs text-ink-500 truncate">
                                        {row.email} · granted {timeAgo(row.grantedAt)}
                                        {row.grantedBy && ` by ${row.grantedBy}`}
                                    </span>
                                </div>
                                <Badge tone="blue">{ROLE_LABELS[row.role]}</Badge>
                                {row.uid !== user?.uid && (
                                    <button
                                        onClick={() => revoke(row)}
                                        disabled={busy}
                                        className="text-ink-500 hover:text-red-300 transition-colors shrink-0"
                                        title="Revoke access"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            <Panel>
                <PanelHeader title="What each role can do" />
                <div className="p-4 grid gap-3 sm:grid-cols-2">
                    {ADMIN_ROLES.map((r) => (
                        <div key={r} className="p-3.5 rounded-xl bg-ink-850 border border-ink-600 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-ink-100">{ROLE_LABELS[r]}</span>
                                <span className="text-[11px] text-ink-500 ml-auto">{ROLE_PERMISSIONS[r].length} permissions</span>
                            </div>
                            <p className="text-xs text-ink-400">{ROLE_DESCRIPTIONS[r]}</p>
                            <div className="flex flex-wrap gap-1">
                                {ROLE_PERMISSIONS[r].map((p) => (
                                    <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-ink-800 border border-ink-600 text-ink-500">
                                        {p}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Panel>
        </div>
    );
}
