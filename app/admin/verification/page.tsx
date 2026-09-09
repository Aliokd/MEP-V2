"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Search, X } from "lucide-react";
import { authedFetch } from "@/lib/authedFetch";

interface Row {
    uid: string;
    name: string;
    bio: string;
    photoURL: string;
    status: "pending" | "approved" | "declined";
    submittedAt: number;
    reviewedAt: number | null;
    note: string | null;
    grantedByAdmin?: boolean;
}

interface Candidate {
    uid: string;
    name: string;
    email: string;
}

type Tab = "pending" | "approved" | "declined";

function when(ms: number): string {
    return ms ? new Date(ms).toLocaleString() : "–";
}

/**
 * Verification queue. Each card is what the songwriter submitted — the photo
 * and the biography — and two decisions. Approving sets the public mark;
 * declining sends a note back. Both are audited.
 */
export default function VerificationPage() {
    const [tab, setTab] = useState<Tab>("pending");
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [notes, setNotes] = useState<Record<string, string>>({});

    // Chosen people waiting to be verified directly, and what came back.
    const [query, setQuery] = useState("");
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [searching, setSearching] = useState(false);
    const [chosen, setChosen] = useState<Candidate[]>([]);
    const [granting, setGranting] = useState(false);
    const [grantNote, setGrantNote] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        // Cleared, not left in place: the previous tab's cards would otherwise
        // sit under "Loading…" as if they belonged to this one, which is how an
        // approved-and-noted request came to appear in the Pending list.
        setRows([]);
        try {
            const res = await authedFetch(`/api/admin/verification?status=${tab}`);
            const data = await res.json();
            setRows(data.requests ?? []);
        } catch (err) {
            console.error("Could not load verification requests:", err);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [tab]);

    useEffect(() => { void load(); }, [load]);

    // People search for the direct-verify picker, debounced. Anyone with an
    // account can be verified, so this is the whole user list, not the queue.
    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) { setCandidates([]); return; }
        let cancelled = false;
        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const res = await authedFetch(`/api/admin/users?q=${encodeURIComponent(q)}&limit=8`);
                const data = await res.json();
                if (cancelled) return;
                const already = new Set(chosen.map((c) => c.uid));
                setCandidates(
                    (data.users ?? [])
                        .filter((u: any) => !already.has(u.uid))
                        .map((u: any) => ({ uid: u.uid, name: u.name || "", email: u.email || "" })),
                );
            } catch {
                if (!cancelled) setCandidates([]);
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [query, chosen]);

    const verifyChosen = async () => {
        if (chosen.length === 0) return;
        const who = chosen.length === 1 ? (chosen[0].name || chosen[0].email || chosen[0].uid) : `${chosen.length} people`;
        if (!window.confirm(`Give the verified mark to ${who}? They see the congratulations popup straight away.`)) return;

        setGranting(true);
        setGrantNote(null);
        try {
            const res = await authedFetch("/api/admin/verification/grant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uids: chosen.map((c) => c.uid) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not verify");

            const results: { uid: string; name: string; status: string }[] = data.results ?? [];
            const verified = results.filter((r) => r.status === "verified");
            const skipped = results.filter((r) => r.status !== "verified");
            setGrantNote(
                [
                    verified.length > 0
                        ? `Verified ${verified.length === 1 ? verified[0].name || verified[0].uid : `${verified.length} people`}.`
                        : "",
                    skipped.length > 0
                        ? `Skipped: ${skipped.map((r) => `${r.name || r.uid} (${r.status})`).join(", ")}.`
                        : "",
                ].filter(Boolean).join(" "),
            );
            setChosen([]);
            setQuery("");
            // Land where the newly verified people are. Switching tabs reloads
            // through the effect; reloading by hand is only needed when the
            // Approved tab is already the one showing.
            if (verified.length > 0) {
                if (tab === "approved") await load();
                else setTab("approved");
            }
        } catch (err: any) {
            setGrantNote(err.message || "Could not verify");
        } finally {
            setGranting(false);
        }
    };

    const decide = async (uid: string, decision: "approve" | "decline") => {
        setBusy(uid);
        try {
            await authedFetch(`/api/admin/verification/${uid}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ decision, note: notes[uid] ?? "" }),
            });
            await load();
        } catch (err) {
            console.error("Decision failed:", err);
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-3">
                <BadgeCheck className="w-6 h-6 text-[#86BE7F]" />
                <div>
                    <h1 className="text-xl font-semibold text-ink-100">Verification</h1>
                    <p className="text-sm text-ink-400">Songwriters who asked for the verified mark, and anyone you verify directly.</p>
                </div>
            </header>

            {/* Verifying someone who never asked. The queue below answers
                requests; this is the team deciding on its own. */}
            <section className="rounded-2xl border border-ink-800 bg-ink-900/60 p-5 space-y-3">
                <div>
                    <h2 className="text-sm font-medium text-ink-100">Verify someone directly</h2>
                    <p className="text-xs text-ink-400">
                        Search by name or email. They get the mark straight away, and the congratulations
                        popup the moment they are next in the app.
                    </p>
                </div>

                {chosen.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {chosen.map((c) => (
                            <span
                                key={c.uid}
                                title={c.email}
                                className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-ink-800 text-xs text-ink-100"
                            >
                                {c.name || c.email || c.uid}
                                <button
                                    type="button"
                                    onClick={() => setChosen((list) => list.filter((x) => x.uid !== c.uid))}
                                    aria-label={`Remove ${c.name || c.email}`}
                                    className="p-0.5 rounded-full text-ink-400 hover:text-ink-100 hover:bg-ink-700"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[260px]">
                        <Search className="w-3.5 h-3.5 text-ink-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Add a songwriter"
                            className="w-full bg-ink-950 border border-ink-800 rounded-lg pl-8 pr-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-ink-600"
                        />
                        {query.trim().length >= 2 && (searching || candidates.length > 0) && (
                            <div className="absolute z-10 left-0 right-0 mt-1 rounded-xl border border-ink-700 bg-ink-900 shadow-xl overflow-hidden">
                                {searching && candidates.length === 0 && (
                                    <p className="px-3 py-2.5 text-xs text-ink-400">Searching…</p>
                                )}
                                {candidates.map((c) => (
                                    <button
                                        key={c.uid}
                                        type="button"
                                        onClick={() => {
                                            setChosen((list) => (list.some((x) => x.uid === c.uid) ? list : [...list, c]));
                                            setQuery("");
                                            setCandidates([]);
                                        }}
                                        className="w-full text-left px-3 py-2 hover:bg-ink-800 flex items-center justify-between gap-3"
                                    >
                                        <span className="text-sm text-ink-100 truncate">{c.name || "No name"}</span>
                                        <span className="text-xs text-ink-400 truncate">{c.email}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        disabled={chosen.length === 0 || granting}
                        onClick={verifyChosen}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-[#86BE7F] text-ink-950 hover:brightness-105 transition-all disabled:opacity-50"
                    >
                        {granting
                            ? "Verifying…"
                            : chosen.length > 1
                              ? `Verify ${chosen.length} people`
                              : "Verify"}
                    </button>
                </div>

                {grantNote && <p className="text-xs text-ink-300">{grantNote}</p>}
            </section>

            <div className="flex gap-1 rounded-full bg-ink-900 p-1 w-fit">
                {(["pending", "approved", "declined"] as Tab[]).map((k) => (
                    <button
                        key={k}
                        type="button"
                        onClick={() => setTab(k)}
                        className={`px-4 py-1.5 rounded-full text-sm capitalize transition-colors ${
                            tab === k ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-200"
                        }`}
                    >
                        {k}
                    </button>
                ))}
            </div>

            {loading && <p className="text-sm text-ink-400">Loading…</p>}
            {!loading && rows.length === 0 && (
                <p className="text-sm text-ink-400">Nothing {tab} right now.</p>
            )}

            <div className="grid gap-4">
                {rows.map((r) => (
                    <article key={r.uid} className="rounded-2xl border border-ink-800 bg-ink-900/60 p-5 flex gap-5">
                        {r.photoURL
                            ? <img src={r.photoURL} alt="" className="w-20 h-20 rounded-full object-cover shrink-0 bg-ink-800" />
                            : <div className="w-20 h-20 rounded-full bg-ink-800 shrink-0" />}
                        <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <h2 className="text-lg font-medium text-ink-100">{r.name || r.uid}</h2>
                                <span className="text-xs text-ink-500 font-mono">{r.uid}</span>
                                {r.grantedByAdmin ? (
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#86BE7F]/15 text-[#86BE7F]">
                                        verified by an admin
                                    </span>
                                ) : (
                                    <span className="text-xs text-ink-400">submitted {when(r.submittedAt)}</span>
                                )}
                                {r.reviewedAt && <span className="text-xs text-ink-400">reviewed {when(r.reviewedAt)}</span>}
                            </div>
                            {r.bio && <p className="text-sm text-ink-200 whitespace-pre-wrap leading-relaxed">{r.bio}</p>}
                            {r.note && <p className="text-xs text-ink-400">Note: {r.note}</p>}

                            {r.status === "pending" && (
                                <div className="flex flex-wrap items-center gap-3 pt-1">
                                    <input
                                        value={notes[r.uid] ?? ""}
                                        onChange={(e) => setNotes((n) => ({ ...n, [r.uid]: e.target.value }))}
                                        placeholder="Note to the songwriter (optional, shown on decline)"
                                        className="flex-1 min-w-[240px] bg-ink-950 border border-ink-800 rounded-lg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-ink-600"
                                    />
                                    <button
                                        type="button"
                                        disabled={busy === r.uid}
                                        onClick={() => decide(r.uid, "decline")}
                                        className="px-4 py-2 rounded-lg text-sm text-ink-300 hover:text-ink-100 border border-ink-800 hover:border-ink-600 transition-colors disabled:opacity-50"
                                    >
                                        Decline
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busy === r.uid}
                                        onClick={() => decide(r.uid, "approve")}
                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-[#86BE7F] text-ink-950 hover:brightness-105 transition-all disabled:opacity-50"
                                    >
                                        Approve
                                    </button>
                                </div>
                            )}
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
