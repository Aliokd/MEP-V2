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

/** One account in the All users tab: who they are, and whether they carry the mark. */
interface Person {
    uid: string;
    name: string;
    email: string;
    photoURL: string;
    createdAt: number | null;
    verified: boolean;
    verifiedAt: number | null;
    requestStatus: "pending" | "approved" | "declined" | null;
    grantedByAdmin: boolean;
}

type Tab = "pending" | "approved" | "declined" | "users";
type PeopleFilter = "all" | "verified" | "unverified";

const TAB_LABELS: Record<Tab, string> = {
    pending: "Pending",
    approved: "Approved",
    declined: "Declined",
    users: "All users",
};

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

    // The All users tab: every account in one go, searched and filtered here
    // rather than over the wire — the whole list is a few dozen rows.
    const [people, setPeople] = useState<Person[]>([]);
    const [peopleLoading, setPeopleLoading] = useState(false);
    const [peopleQuery, setPeopleQuery] = useState("");
    const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>("all");
    const [truncated, setTruncated] = useState(false);
    const [verifyingUid, setVerifyingUid] = useState<string | null>(null);

    const loadPeople = useCallback(async () => {
        setPeopleLoading(true);
        try {
            const res = await authedFetch("/api/admin/verification/users");
            const data = await res.json();
            setPeople(data.users ?? []);
            setTruncated(Boolean(data.truncated));
        } catch (err) {
            console.error("Could not load users:", err);
            setPeople([]);
        } finally {
            setPeopleLoading(false);
        }
    }, []);

    const load = useCallback(async () => {
        // The All users tab has its own list; clearing here keeps the request
        // cards from sitting under it as though they belonged to it.
        if (tab === "users") { setRows([]); return; }
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
    useEffect(() => { if (tab === "users") void loadPeople(); }, [tab, loadPeople]);

    /** Verify one person straight from the list. */
    const verifyOne = async (person: Person) => {
        const who = person.name || person.email || person.uid;
        if (!window.confirm(`Give the verified mark to ${who}? They see the congratulations popup straight away.`)) return;
        setVerifyingUid(person.uid);
        try {
            const res = await authedFetch("/api/admin/verification/grant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uids: [person.uid] }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not verify");
            await loadPeople();
        } catch (err) {
            console.error("Could not verify:", err);
            window.alert(err instanceof Error ? err.message : "Could not verify");
        } finally {
            setVerifyingUid(null);
        }
    };

    const visiblePeople = people.filter((p) => {
        if (peopleFilter === "verified" && !p.verified) return false;
        if (peopleFilter === "unverified" && p.verified) return false;
        const q = peopleQuery.trim().toLowerCase();
        if (!q) return true;
        return `${p.name} ${p.email} ${p.uid}`.toLowerCase().includes(q);
    });
    const verifiedCount = people.filter((p) => p.verified).length;

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
                requests; this is the team deciding on its own. Hidden on the
                All users tab, which verifies from the row itself and would
                otherwise put a second search box on the same screen. */}
            <section className={`rounded-2xl border border-ink-800 bg-ink-900/60 p-5 space-y-3 ${tab === "users" ? "hidden" : ""}`}>
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
                {(["pending", "approved", "declined", "users"] as Tab[]).map((k) => (
                    <button
                        key={k}
                        type="button"
                        onClick={() => setTab(k)}
                        className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                            tab === k ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-200"
                        }`}
                    >
                        {TAB_LABELS[k]}
                    </button>
                ))}
            </div>

            {tab === "users" && (
                <section className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[260px]">
                            <Search className="w-3.5 h-3.5 text-ink-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                value={peopleQuery}
                                onChange={(e) => setPeopleQuery(e.target.value)}
                                placeholder="Search by name or email"
                                className="w-full bg-ink-950 border border-ink-800 rounded-lg pl-8 pr-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-ink-600"
                            />
                        </div>

                        <div className="flex gap-1 rounded-full bg-ink-900 p-1">
                            {([
                                { id: "all" as const, label: `All ${people.length}` },
                                { id: "verified" as const, label: `Verified ${verifiedCount}` },
                                { id: "unverified" as const, label: `Not verified ${people.length - verifiedCount}` },
                            ]).map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setPeopleFilter(f.id)}
                                    className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                                        peopleFilter === f.id ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-200"
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {truncated && (
                        <p className="text-xs text-gold-300">
                            Showing the first 500 accounts. There are more than this list can hold.
                        </p>
                    )}

                    {peopleLoading && <p className="text-sm text-ink-400">Loading…</p>}
                    {!peopleLoading && visiblePeople.length === 0 && (
                        <p className="text-sm text-ink-400">Nobody matches that.</p>
                    )}

                    <ul className="rounded-2xl border border-ink-800 bg-ink-900/60 divide-y divide-ink-800 overflow-hidden">
                        {visiblePeople.map((p) => (
                            <li key={p.uid} className="flex items-center gap-4 px-4 py-3">
                                {p.photoURL
                                    ? <img src={p.photoURL} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 bg-ink-800" />
                                    : <div className="w-9 h-9 rounded-full bg-ink-800 shrink-0" />}

                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-ink-100 truncate">{p.name || "No name"}</p>
                                    <p className="text-xs text-ink-500 truncate">{p.email || p.uid}</p>
                                </div>

                                {/* Someone waiting on a decision is worth seeing here too:
                                    the queue is where it gets answered. */}
                                {!p.verified && p.requestStatus === "pending" && (
                                    <button
                                        type="button"
                                        onClick={() => setTab("pending")}
                                        className="text-[11px] px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-300 hover:bg-gold-500/25 transition-colors shrink-0"
                                    >
                                        asked to be verified
                                    </button>
                                )}

                                {p.verified ? (
                                    <span
                                        title={p.verifiedAt ? `Verified ${when(p.verifiedAt)}` : undefined}
                                        className="inline-flex items-center gap-1.5 text-xs text-[#86BE7F] shrink-0"
                                    >
                                        <BadgeCheck className="w-4 h-4" /> Verified
                                    </span>
                                ) : (
                                    <>
                                        <span className="text-xs text-ink-500 shrink-0">Not verified</span>
                                        <button
                                            type="button"
                                            disabled={verifyingUid === p.uid}
                                            onClick={() => verifyOne(p)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#86BE7F] text-ink-950 hover:brightness-105 transition-all disabled:opacity-50 shrink-0"
                                        >
                                            {verifyingUid === p.uid ? "Verifying…" : "Verify"}
                                        </button>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {tab !== "users" && loading && <p className="text-sm text-ink-400">Loading…</p>}
            {tab !== "users" && !loading && rows.length === 0 && (
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
