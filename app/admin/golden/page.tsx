"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Plus, Send, Copy, ExternalLink, RotateCcw, Ban, Trash2, KeyRound, Check, Eye, EyeOff, Ticket as TicketIcon } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, PanelHeader, StatTile, Badge, Button, Input, Textarea, EmptyState, SkeletonRows, Spinner, timeAgo } from "../components/ui";
import MediaUpload from "../components/MediaUpload";
import GoldenWall from "./GoldenWall";
import TicketSheet, { type SheetTarget } from "./TicketSheet";

/**
 * The Golden program console: the hundred tickets, who took which, the code
 * on each, and the buttons that mint, send, reset, revoke and delete them.
 * The public wall is /golden; each row links to its page.
 */

type Status = "open" | "claimed" | "redeemed" | "revoked";

interface Ticket {
    slug: string;
    number: number;
    name: string;
    tagline: string | null;
    note: string | null;
    photoUrl: string | null;
    email: string | null;
    code: string;
    status: Status;
    claim: { email: string; message: string | null; locale: string; claimedAt: string } | null;
    redeemedBy: { uid: string; at: string; email: string | null } | null;
    invites: number;
    /** Whether it hangs on the public wall at /golden. */
    listed: boolean;
    /** Chosen here, or issued with a lifetime grant in Users. */
    origin: "console" | "grant";
    createdAt: string;
    updatedAt: string;
    pagePath: string;
}

const STATUS_TONE: Record<Status, "neutral" | "green" | "gold" | "red" | "blue"> = {
    open: "neutral",
    claimed: "gold",
    redeemed: "green",
    revoked: "red",
};

const EMPTY_FORM = { name: "", tagline: "", note: "", photoUrl: "", email: "" };

function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : "Something went wrong";
}

export default function GoldenAdminPage() {
    const { adminFetch, can } = useAdmin();
    const canWrite = can("golden.write");

    const [tickets, setTickets] = useState<Ticket[] | null>(null);
    const [total, setTotal] = useState(100);
    const [counts, setCounts] = useState({ open: 0, claimed: 0, redeemed: 0, revoked: 0 });
    const [capacity, setCapacity] = useState({ held: 0, free: 0 });
    const [unticketed, setUnticketed] = useState<{ uid: string; name: string | null; email: string | null }[]>([]);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    // Which ticket, or which empty place, the sheet is open on.
    const [sheet, setSheet] = useState<SheetTarget | null>(null);
    const [busySlug, setBusySlug] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [filter, setFilter] = useState<"all" | Status>("all");
    // The wall is the view that answers "how many of the hundred are gone",
    // which is the first question asked of this page; the list is the one
    // that answers "what do I do about this ticket".
    const [view, setView] = useState<"wall" | "list">("wall");

    /** Returns the fresh list, so a caller can re-read the ticket it is showing. */
    const load = useCallback(async (): Promise<Ticket[] | null> => {
        setRefreshing(true);
        setError(null);
        try {
            const res = await adminFetch("/api/admin/golden");
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load the tickets");
            const data = await res.json();
            setTickets(data.tickets);
            setTotal(data.total);
            setCounts(data.counts);
            setCapacity(data.capacity ?? { held: 0, free: 0 });
            setUnticketed(data.unticketed ?? []);
            return data.tickets as Ticket[];
        } catch (err) {
            setError(errorMessage(err));
            setTickets([]);
            return null;
        } finally {
            setRefreshing(false);
        }
    }, [adminFetch]);

    useEffect(() => {
        load();
    }, [load]);

    const visible = useMemo(
        () => (tickets ?? []).filter((t) => filter === "all" || t.status === filter),
        [tickets, filter],
    );

    const flash = (message: string) => {
        setNotice(message);
        window.setTimeout(() => setNotice(null), 4000);
    };

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const res = await adminFetch("/api/admin/golden", { method: "POST", body: JSON.stringify(form) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not create the ticket");
            setForm(EMPTY_FORM);
            setShowForm(false);
            flash(`Ticket ${data.ticket.number} minted for ${data.ticket.name}.`);
            await load();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const patch = async (slug: string, body: Record<string, unknown>, done: string) => {
        setBusySlug(slug);
        setError(null);
        try {
            const res = await adminFetch(`/api/admin/golden/${slug}`, { method: "PATCH", body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "The change failed");
            flash(done);
            await load();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusySlug(null);
        }
    };

    const openSheet = (t: Ticket) => setSheet({ kind: "ticket", ticket: t });

    const resend = async (t: Ticket) => {
        const fallback = t.claim?.email ?? t.email ?? "";
        const to = window.prompt(
            t.status === "open"
                ? `Send the ticket straight to an address? This takes the ticket on ${t.name}'s behalf.`
                : `Resend the ticket to:`,
            fallback,
        );
        if (to === null) return;
        setBusySlug(t.slug);
        setError(null);
        try {
            const res = await adminFetch(`/api/admin/golden/${t.slug}/resend`, {
                method: "POST",
                body: JSON.stringify({ email: to.trim() || undefined }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "The email could not be sent");
            flash(`Ticket sent to ${data.to}.`);
            await load();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusySlug(null);
        }
    };

    const remove = async (t: Ticket) => {
        const held = Boolean(t.redeemedBy);
        const warning = held
            ? `Delete ticket ${t.number} (${t.name})?

Spot ${t.number} becomes free for someone else, and the ticket comes off ${t.redeemedBy?.email || "their"} account. Their lifetime access is NOT changed; do that in Users.`
            : `Delete ticket ${t.number} (${t.name}) from the wall?

Spot ${t.number} becomes free for someone else. This cannot be undone.`;
        if (!window.confirm(warning)) return;
        setBusySlug(t.slug);
        setError(null);
        try {
            const res = await adminFetch(`/api/admin/golden/${t.slug}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not delete the ticket");
            flash(`Ticket ${t.number} deleted. Spot ${t.number} is free.`);
            await load();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusySlug(null);
        }
    };

    // Hands every lifetime account with no ticket the next free number.
    const sync = async () => {
        if (!window.confirm(`Issue a golden ticket to ${unticketed.length} lifetime ${unticketed.length === 1 ? "account" : "accounts"} that have none? They go on the wall as taken.`)) return;
        setSyncing(true);
        setError(null);
        try {
            const res = await adminFetch("/api/admin/golden/sync", { method: "POST", body: JSON.stringify({ listed: true }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not issue the tickets");
            flash(
                data.issued.length
                    ? `${data.issued.length} ticket${data.issued.length === 1 ? "" : "s"} issued.${data.remaining ? ` ${data.remaining} still without one.` : ""}`
                    : data.message || "Nothing to issue.",
            );
            await load();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSyncing(false);
        }
    };

    const copy = async (value: string, key: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(key);
            window.setTimeout(() => setCopied(null), 1500);
        } catch {
            window.prompt("Copy:", value);
        }
    };

    const origin = typeof window !== "undefined" ? window.location.origin : "";

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Golden program"
                description={`The ${total} hand-picked songwriters, their pages at /golden, and the ticket each one holds. Granting Lifetime Pro in Users issues one of these automatically.`}
                action={
                    <div className="flex items-center gap-2">
                        <a href="/golden" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-ink-300 hover:text-ink-100">
                            <ExternalLink className="w-3.5 h-3.5" /> Open the wall
                        </a>
                        <Button onClick={load} disabled={refreshing} size="sm">
                            {refreshing ? <Spinner className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Refresh
                        </Button>
                        {canWrite && (
                            <Button variant="primary" size="sm" onClick={() => setShowForm((v) => !v)}>
                                <Plus className="w-3.5 h-3.5" /> New ticket
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatTile label="On the wall" value={`${capacity.held} / ${total}`} hint={`${capacity.free} spot${capacity.free === 1 ? "" : "s"} free`} />
                <StatTile label="Open" value={counts.open} />
                <StatTile label="Claimed" value={counts.claimed} tone="gold" />
                <StatTile label="Redeemed" value={counts.redeemed} tone="green" />
                <StatTile label="Revoked" value={counts.revoked} tone={counts.revoked ? "red" : "neutral"} />
            </div>

            {error && (
                <Panel className="p-4 border-red-500/30">
                    <p className="text-sm text-red-300">{error}</p>
                </Panel>
            )}
            {notice && (
                <Panel className="p-4 border-green-500/30">
                    <p className="text-sm text-green-300 flex items-center gap-2"><Check className="w-4 h-4" /> {notice}</p>
                </Panel>
            )}

            {showForm && canWrite && (
                <Panel>
                    <PanelHeader title="New ticket" subtitle="Mints the next free number and a fresh code. Nothing is sent until the person takes it, or you send it." />
                    <form onSubmit={create} className="p-5 grid md:grid-cols-2 gap-4">
                        <TicketFields form={form} setForm={setForm} nameHint={form.name || "golden"} />
                        <div className="md:col-span-2 flex items-center gap-2 justify-end">
                            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                            <Button type="submit" variant="primary" disabled={saving || !form.name.trim()}>
                                {saving ? <Spinner className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} Mint ticket
                            </Button>
                        </div>
                    </form>
                </Panel>
            )}

            {unticketed.length > 0 && canWrite && (
                <Panel className="p-4 border-gold-500/30 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="min-w-0">
                        <p className="text-sm text-ink-100">
                            {unticketed.length} lifetime {unticketed.length === 1 ? "account holds" : "accounts hold"} no golden ticket.
                        </p>
                        <p className="text-xs text-ink-400 truncate">
                            {unticketed.slice(0, 4).map((u) => u.email || u.name || u.uid).join(", ")}
                            {unticketed.length > 4 ? ` and ${unticketed.length - 4} more` : ""}
                        </p>
                    </div>
                    <Button
                        variant="primary"
                        size="sm"
                        className="sm:ml-auto shrink-0"
                        disabled={syncing || capacity.free === 0}
                        title={capacity.free === 0 ? "The wall is full. Free a spot first." : "Give each of them the next free number"}
                        onClick={sync}
                    >
                        {syncing ? <Spinner className="w-3.5 h-3.5" /> : <TicketIcon className="w-3.5 h-3.5" />}
                        Issue their tickets
                    </Button>
                </Panel>
            )}

            <Panel>
                <PanelHeader
                    title="Tickets"
                    subtitle={
                        view === "wall"
                            ? "All hundred places. Press a free one to activate it for somebody."
                            : "Number, name, status and the code. Claims show the address the ticket went to."
                    }
                    action={
                        <div className="flex items-center gap-3">
                            {view === "list" && (
                                <div className="flex items-center gap-1">
                                    {(["all", "open", "claimed", "redeemed", "revoked"] as const).map((f) => (
                                        <button
                                            key={f}
                                            type="button"
                                            onClick={() => setFilter(f)}
                                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${filter === f ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-200"}`}
                                        >
                                            {f === "all" ? "All" : f[0].toUpperCase() + f.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center gap-1 rounded-full border border-ink-600 p-0.5">
                                {(["wall", "list"] as const).map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setView(v)}
                                        className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${view === v ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-200"}`}
                                    >
                                        {v === "wall" ? "Wall" : "List"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    }
                />
                {tickets === null ? (
                    <div className="p-5"><SkeletonRows rows={6} /></div>
                ) : view === "wall" ? (
                    <GoldenWall
                        tickets={tickets}
                        total={total}
                        canWrite={canWrite}
                        onPick={(slug) => {
                            const picked = tickets.find((t) => t.slug === slug);
                            if (picked) openSheet(picked);
                        }}
                        onPickFree={(n) => setSheet({ kind: "free", number: n })}
                    />
                ) : visible.length === 0 ? (
                    <div className="p-5">
                        <EmptyState
                            title={tickets.length === 0 ? "No tickets yet" : "Nothing matches"}
                            description={tickets.length === 0 ? "Mint the first ticket and it appears on the wall at once." : "Try another filter."}
                        />
                    </div>
                ) : (
                    <ul className="divide-y divide-ink-600">
                        {visible.map((t) => {
                            const busy = busySlug === t.slug;
                            const redeemUrl = `${origin}/onboarding?from=golden&golden=${encodeURIComponent(t.code)}`;
                            return (
                                <li key={t.slug} className="px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
                                    <div className="flex items-center gap-3 min-w-0 lg:w-[34%]">
                                        <span className="w-8 text-xs text-ink-400 tabular-nums shrink-0">{t.number}</span>
                                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-ink-700 shrink-0">
                                            {t.photoUrl && (
                                                <img src={t.photoUrl} alt="" className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <a href={t.pagePath} target="_blank" rel="noreferrer" className="text-sm font-medium text-ink-100 hover:underline truncate">{t.name}</a>
                                                <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                                                {t.origin === "grant" && <Badge tone="blue">granted</Badge>}
                                                {!t.listed && <Badge tone="neutral">off the wall</Badge>}
                                            </div>
                                            <p className="text-xs text-ink-400 truncate">{t.tagline || t.pagePath}</p>
                                        </div>
                                    </div>

                                    <div className="min-w-0 lg:w-[30%] text-xs text-ink-300 space-y-0.5">
                                        {t.claim ? (
                                            <>
                                                <p className="truncate">Taken by <span className="text-ink-100">{t.claim.email}</span> {timeAgo(t.claim.claimedAt)}</p>
                                                {t.claim.message && <p className="text-ink-400 line-clamp-2">“{t.claim.message}”</p>}
                                            </>
                                        ) : t.email ? (
                                            <p className="truncate">On file: <span className="text-ink-100">{t.email}</span></p>
                                        ) : (
                                            <p className="text-ink-500">No address yet</p>
                                        )}
                                        {t.redeemedBy && (
                                            <p className="text-green-400 truncate">
                                                Held by {t.redeemedBy.email || `uid ${t.redeemedBy.uid.slice(0, 8)}…`} since {timeAgo(t.redeemedBy.at)}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 lg:w-[16%]">
                                        <code className="text-xs text-ink-200 tracking-wider">{t.code}</code>
                                        <button type="button" title="Copy code" onClick={() => copy(t.code, `code-${t.slug}`)} className="text-ink-400 hover:text-ink-100">
                                            {copied === `code-${t.slug}` ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                        <button type="button" title="Copy redeem link" onClick={() => copy(redeemUrl, `link-${t.slug}`)} className="text-ink-400 hover:text-ink-100">
                                            {copied === `link-${t.slug}` ? <Check className="w-3.5 h-3.5 text-green-400" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>

                                    {canWrite && (
                                        <div className="flex items-center gap-1 flex-wrap lg:justify-end lg:flex-1">
                                            <Button size="sm" variant="ghost" disabled={busy} onClick={() => openSheet(t)}>
                                                Open
                                            </Button>
                                            {t.status !== "revoked" && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={busy}
                                                    title={t.listed ? "On the wall at /golden. Take it down." : "Not on the wall. Put it up."}
                                                    onClick={() => patch(t.slug, { listed: !t.listed }, t.listed ? `Ticket ${t.number} is off the wall.` : `Ticket ${t.number} is on the wall.`)}
                                                >
                                                    {t.listed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                                </Button>
                                            )}
                                            {t.status !== "revoked" && t.status !== "redeemed" && (
                                                <Button size="sm" variant="ghost" disabled={busy} onClick={() => resend(t)} title={t.status === "open" ? "Send the ticket to an address" : "Resend the ticket"}>
                                                    <Send className="w-3.5 h-3.5" /> {t.status === "open" ? "Send" : "Resend"}
                                                </Button>
                                            )}
                                            {t.status === "claimed" && (
                                                <Button size="sm" variant="ghost" disabled={busy} title="Forget the claim; the ticket is open again" onClick={() => { if (window.confirm(`Reset ticket ${t.number}? The claim by ${t.claim?.email} is forgotten.`)) patch(t.slug, { status: "open" }, `Ticket ${t.number} is open again.`); }}>
                                                    <RotateCcw className="w-3.5 h-3.5" /> Reset
                                                </Button>
                                            )}
                                            {t.status !== "revoked" && (
                                                <Button size="sm" variant="ghost" disabled={busy} title="A fresh code; the old one stops working" onClick={() => { if (window.confirm(`New code for ticket ${t.number}? The old one stops working at once.`)) patch(t.slug, { newCode: true }, `Ticket ${t.number} has a new code.`); }}>
                                                    <KeyRound className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                            {t.status !== "revoked" ? (
                                                <Button size="sm" variant="danger" disabled={busy} onClick={() => { if (window.confirm(`Revoke ticket ${t.number}? The page will say it is no longer available.`)) patch(t.slug, { status: "revoked" }, `Ticket ${t.number} revoked.`); }}>
                                                    <Ban className="w-3.5 h-3.5" />
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="ghost" disabled={busy} onClick={() => patch(t.slug, { status: "open" }, `Ticket ${t.number} is open again.`)}>
                                                    <RotateCcw className="w-3.5 h-3.5" /> Reopen
                                                </Button>
                                            )}
                                            <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove(t)} title="Delete, and free the spot">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                            {busy && <Spinner className="w-3.5 h-3.5" />}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Panel>

            {/* The ticket, opened. Everything that can be done to a place on
                the wall and to whoever holds it lives in here. */}
            {sheet && (
                <TicketSheet
                    target={sheet}
                    canWrite={canWrite}
                    onClose={() => setSheet(null)}
                    onChanged={async (note) => {
                        flash(note);
                        const fresh = await load();
                        // Keep the sheet on the same ticket, showing what
                        // just changed, rather than closing under the press.
                        setSheet((current) => {
                            if (!current || !fresh) return current;
                            const slug = current.kind === "ticket" ? current.ticket.slug : null;
                            const number = current.kind === "ticket" ? current.ticket.number : current.number;
                            const still = fresh.find((t) => (slug ? t.slug === slug : t.number === number && t.status !== "revoked"));
                            return still ? { kind: "ticket", ticket: still } : current;
                        });
                    }}
                />
            )}
        </div>
    );
}

function TicketFields({
    form,
    setForm,
    nameHint,
}: {
    form: typeof EMPTY_FORM;
    setForm: (f: typeof EMPTY_FORM) => void;
    nameHint: string;
}) {
    return (
        <>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-ink-400">Name</span>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name, as it should read on the wall" required />
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-ink-400">Tagline</span>
                <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Songwriter, Oslo" />
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-2">
                <span className="text-xs text-ink-400">A personal line (shown on the page)</span>
                <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} placeholder="Why this person. Written to them, in your words." />
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-ink-400">Email on file (optional, never shown)</span>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="If you already have it" />
            </label>
            <div className="flex flex-col gap-1.5">
                <MediaUpload
                    label="Photo"
                    kind="image"
                    value={form.photoUrl}
                    onChange={(url) => setForm({ ...form, photoUrl: url })}
                    nameHint={nameHint}
                    hint="Square works best. Or paste an https URL below."
                />
                <Input value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} placeholder="https://… or /assets/…" />
            </div>
        </>
    );
}
