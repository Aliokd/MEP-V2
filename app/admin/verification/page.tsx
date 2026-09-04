"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
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
}

type Tab = "pending" | "approved" | "declined";

function when(ms: number): string {
    return ms ? new Date(ms).toLocaleString() : "—";
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

    const load = useCallback(async () => {
        setLoading(true);
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
                    <p className="text-sm text-ink-400">Songwriters who asked for the verified mark.</p>
                </div>
            </header>

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
                                <span className="text-xs text-ink-400">submitted {when(r.submittedAt)}</span>
                                {r.reviewedAt && <span className="text-xs text-ink-400">reviewed {when(r.reviewedAt)}</span>}
                            </div>
                            <p className="text-sm text-ink-200 whitespace-pre-wrap leading-relaxed">{r.bio}</p>
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
