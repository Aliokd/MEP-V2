"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, RefreshCw } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, Badge, Button, Input, Select, EmptyState, SkeletonRows, Spinner, timeAgo } from "../components/ui";
import UserDetail from "./UserDetail";

export interface DirectoryUser {
    uid: string;
    name: string | null;
    email: string | null;
    tier: string | null;
    locale: string | null;
    createdAt: number | null;
    lastActiveAt: number | null;
    plan: string | null;
    subscriptionStatus: string | null;
    trialEndsAt: string | null;
    sanctioned: boolean;
}

const TIER_TONE: Record<string, "neutral" | "green" | "gold"> = {
    trial: "gold",
    pro: "green",
    max: "green",
    comp: "neutral",
};

export default function UsersPage() {
    return (
        <Suspense fallback={<SkeletonRows rows={6} />}>
            <UserDirectory />
        </Suspense>
    );
}

function UserDirectory() {
    const { adminFetch } = useAdmin();
    const searchParams = useSearchParams();

    const [users, setUsers] = useState<DirectoryUser[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedUid, setSelectedUid] = useState<string | null>(searchParams.get("uid"));

    const [search, setSearch] = useState("");
    const [debounced, setDebounced] = useState("");
    const [tier, setTier] = useState("");
    const [filter, setFilter] = useState(searchParams.get("filter") || "");

    useEffect(() => {
        const id = setTimeout(() => setDebounced(search), 300);
        return () => clearTimeout(id);
    }, [search]);

    const load = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (debounced) params.set("q", debounced);
            if (tier) params.set("tier", tier);
            if (filter) params.set("filter", filter);

            const res = await adminFetch(`/api/admin/users?${params}`);
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load users");
            setUsers((await res.json()).users);
        } catch (err: any) {
            setError(err.message);
            setUsers([]);
        } finally {
            setRefreshing(false);
        }
    }, [adminFetch, debounced, tier, filter]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Users"
                description="Search by name, email or uid. Search is exact-or-prefix — Firestore has no substring index."
                action={
                    <Button onClick={load} disabled={refreshing} size="sm">
                        {refreshing ? <Spinner className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Refresh
                    </Button>
                }
            />

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search className="w-3.5 h-3.5 text-ink-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Name, email or uid"
                        className="pl-8"
                    />
                </div>
                <Select value={tier} onChange={(e) => setTier(e.target.value)}>
                    <option value="">All tiers</option>
                    <option value="trial">Trial</option>
                    <option value="pro">Pro</option>
                    <option value="max">Max</option>
                    <option value="comp">Comped</option>
                </Select>
                <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="">Newest first</option>
                    <option value="trial-expiring">Trial ending in 7 days</option>
                    <option value="inactive">Inactive 30+ days</option>
                </Select>
                {users && <span className="text-xs text-ink-500 ml-auto">{users.length} shown</span>}
            </div>

            {error && (
                <Panel className="p-4 border-red-500/30">
                    <p className="text-sm text-red-300">{error}</p>
                </Panel>
            )}

            <Panel className="overflow-hidden">
                {!users ? (
                    <SkeletonRows rows={8} />
                ) : users.length === 0 ? (
                    <EmptyState title="No users match" description="Try a full email address, or paste a uid." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[720px]">
                            <thead>
                                <tr className="text-left text-xs text-ink-500 border-b border-ink-600">
                                    <th className="font-medium px-4 py-2.5">Person</th>
                                    <th className="font-medium px-4 py-2.5">Tier</th>
                                    <th className="font-medium px-4 py-2.5">Joined</th>
                                    <th className="font-medium px-4 py-2.5">Last active</th>
                                    <th className="font-medium px-4 py-2.5">Trial ends</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-600">
                                {users.map((u) => (
                                    <tr
                                        key={u.uid}
                                        onClick={() => setSelectedUid(u.uid)}
                                        className="hover:bg-ink-800 cursor-pointer transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-ink-100 truncate">{u.name || "Unnamed"}</span>
                                                    {u.sanctioned && <Badge tone="red">sanctioned</Badge>}
                                                </div>
                                                <span className="text-xs text-ink-500 truncate">{u.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge tone={TIER_TONE[u.tier || ""] || "neutral"}>{u.tier || "none"}</Badge>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-ink-400">{timeAgo(u.createdAt)}</td>
                                        <td className="px-4 py-3 text-xs text-ink-400">{timeAgo(u.lastActiveAt)}</td>
                                        <td className="px-4 py-3 text-xs text-ink-400">
                                            {u.trialEndsAt ? new Date(u.trialEndsAt).toLocaleDateString() : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>

            {selectedUid && (
                <UserDetail uid={selectedUid} onClose={() => setSelectedUid(null)} onChanged={load} />
            )}
        </div>
    );
}
