"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Download, ShieldOff, Ban, Clock, TriangleAlert } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Badge, Button, Panel, Select, Spinner, Textarea, Input, timeAgo } from "../components/ui";

interface Detail {
    user: {
        uid: string; name: string | null; email: string | null; tier: string | null;
        locale: string | null; answers: Record<string, string>;
        createdAt: number | null; lastActiveAt: number | null;
        /** Set only on accounts made from the console — the admin's email. */
        createdByAdmin: string | null;
        billing: Record<string, any> | null;
        sanction: Record<string, any> | null;
    };
    auth: { disabled: boolean; emailVerified: boolean; providers: string[]; lastSignInAt: number | null; createdAt: number | null } | null;
    adminRole: string | null;
    stats: { projects: number; posts: number; reportsAgainst: number; reportsFiled: number; feedbackCount: number; supportCount: number };
    sanctions: { id: string; type: string; reason: string; active: boolean; createdAt: number | null; expiresAt: number | null; issuedByEmail: string; liftedAt: number | null }[];
}

export default function UserDetail({
    uid,
    onClose,
    onChanged,
}: {
    uid: string;
    onClose: () => void;
    onChanged: () => void;
}) {
    const { adminFetch, can } = useAdmin();
    const [detail, setDetail] = useState<Detail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [sanctionType, setSanctionType] = useState("warn");
    const [sanctionReason, setSanctionReason] = useState("");
    const [sanctionDays, setSanctionDays] = useState("7");
    const [trialDays, setTrialDays] = useState("14");

    const load = useCallback(async () => {
        try {
            const res = await adminFetch(`/api/admin/users/${uid}`);
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load user");
            setDetail(await res.json());
        } catch (err: any) {
            setError(err.message);
        }
    }, [adminFetch, uid]);

    useEffect(() => {
        setDetail(null);
        load();
    }, [load]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const run = async (fn: () => Promise<Response>, successMessage?: string) => {
        setBusy(true);
        setError(null);
        try {
            const res = await fn();
            if (!res.ok) throw new Error((await res.json()).error || "Action failed");
            await load();
            onChanged();
            if (successMessage) setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const applySanction = () => {
        if (!sanctionReason.trim()) {
            setError("A reason is required. It is emailed to the user.");
            return;
        }
        return run(() =>
            adminFetch(`/api/admin/users/${uid}/sanction`, {
                method: "POST",
                body: JSON.stringify({
                    type: sanctionType,
                    reason: sanctionReason,
                    days: Number(sanctionDays) || 7,
                }),
            }),
        ).then(() => setSanctionReason(""));
    };

    const u = detail?.user;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />

            <aside className="relative w-full max-w-2xl bg-ink-900 border-l border-ink-600 h-full overflow-y-auto">
                <header className="sticky top-0 z-10 bg-ink-900 border-b border-ink-600 px-5 py-4 flex items-start gap-3">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            {u?.tier && <Badge tone={u.tier === "trial" ? "gold" : "green"}>{u.tier}</Badge>}
                            {detail?.adminRole && <Badge tone="blue">{detail.adminRole}</Badge>}
                            {detail?.auth?.disabled && <Badge tone="red">account disabled</Badge>}
                            {u?.sanction?.active && <Badge tone="red">{u.sanction.type}</Badge>}
                        </div>
                        <h2 className="text-base text-ink-100 font-medium">{u?.name || "Loading…"}</h2>
                        <p className="text-xs text-ink-500 break-all">{u?.email} · {uid}</p>
                    </div>
                    <button onClick={onClose} className="text-ink-500 hover:text-ink-100 shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </header>

                {error && <p className="mx-5 mt-4 text-sm text-red-300">{error}</p>}

                {!detail ? (
                    <div className="p-16 flex justify-center"><Spinner className="w-5 h-5" /></div>
                ) : (
                    <div className="p-5 flex flex-col gap-5">
                        {/* Facts */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <Fact label="Joined" value={timeAgo(u!.createdAt)} />
                            {/* Where this account came from. Both halves were already
                                stored and neither was shown, so "how did they get in?"
                                had to be answered by reading Firestore by hand. */}
                            <Fact
                                label="Created by"
                                value={u!.createdByAdmin || "self-signup"}
                            />
                            <Fact label="Signed up with" value={describeProviders(detail.auth?.providers)} />
                            <Fact label="Last active" value={timeAgo(u!.lastActiveAt)} />
                            <Fact label="Last sign-in" value={timeAgo(detail.auth?.lastSignInAt)} />
                            <Fact label="Songs" value={String(detail.stats.projects)} />
                            <Fact label="Community posts" value={String(detail.stats.posts)} />
                            <Fact label="Locale" value={u!.locale?.toUpperCase() || "–"} />
                            <Fact label="Reports against" value={String(detail.stats.reportsAgainst)} tone={detail.stats.reportsAgainst > 0 ? "red" : undefined} />
                            <Fact label="Reports filed" value={String(detail.stats.reportsFiled)} />
                            <Fact label="Wrote in" value={String(detail.stats.feedbackCount + detail.stats.supportCount)} />
                        </div>

                        {/* Billing */}
                        <Panel className="p-4 flex flex-col gap-2">
                            <span className="text-xs text-ink-400">Subscription</span>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-ink-200">
                                <Badge tone={u!.tier === "trial" ? "gold" : "green"}>{u!.tier || "no tier"}</Badge>
                                {u!.billing?.subscriptionStatus && <span className="text-xs text-ink-400">{u!.billing.subscriptionStatus}</span>}
                                {u!.billing?.trialEndsAt && (
                                    <span className="text-xs text-ink-400">
                                        trial ends {new Date(u!.billing.trialEndsAt).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                            {can("users.write") && (
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <Select
                                        value={u!.tier || ""}
                                        onChange={(e) => run(() => adminFetch(`/api/admin/users/${uid}`, {
                                            method: "PATCH",
                                            body: JSON.stringify({ tier: e.target.value }),
                                        }))}
                                        disabled={busy}
                                    >
                                        <option value="trial">Trial</option>
                                        <option value="pro">Pro</option>
                                        <option value="max">Max</option>
                                        <option value="comp">Comped</option>
                                    </Select>
                                    <div className="flex items-center gap-1.5">
                                        <Input
                                            value={trialDays}
                                            onChange={(e) => setTrialDays(e.target.value)}
                                            className="w-16 text-center"
                                            inputMode="numeric"
                                        />
                                        <Button
                                            size="sm"
                                            disabled={busy}
                                            onClick={() => run(() => adminFetch(`/api/admin/users/${uid}`, {
                                                method: "PATCH",
                                                body: JSON.stringify({ extendTrialDays: Number(trialDays) }),
                                            }))}
                                        >
                                            <Clock className="w-3.5 h-3.5" /> Extend trial
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Panel>

                        {/* Onboarding answers — useful context when someone writes in */}
                        {Object.keys(u!.answers || {}).length > 0 && (
                            <Panel className="p-4 flex flex-col gap-2">
                                <span className="text-xs text-ink-400">Onboarding answers</span>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                    {Object.entries(u!.answers).map(([k, v]) => (
                                        <div key={k} className="flex gap-2 min-w-0">
                                            <dt className="text-ink-500 shrink-0">{k}</dt>
                                            <dd className="text-ink-300 truncate">{String(v)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </Panel>
                        )}

                        {/* Moderation history */}
                        {detail.sanctions.length > 0 && (
                            <Panel className="p-4 flex flex-col gap-2">
                                <span className="text-xs text-ink-400">Moderation history</span>
                                {detail.sanctions.map((s) => (
                                    <div key={s.id} className="flex flex-col gap-1 p-3 rounded-xl bg-ink-800 border border-ink-600">
                                        <div className="flex items-center gap-2">
                                            <Badge tone={s.active ? "red" : "neutral"}>{s.type}</Badge>
                                            <span className="text-[11px] text-ink-500">{timeAgo(s.createdAt)} by {s.issuedByEmail}</span>
                                            {s.liftedAt && <span className="text-[11px] text-green-400 ml-auto">lifted</span>}
                                        </div>
                                        <p className="text-xs text-ink-300">{s.reason}</p>
                                    </div>
                                ))}
                            </Panel>
                        )}

                        {/* Sanctions */}
                        {can("users.sanction") && (
                            <Panel className="p-4 flex flex-col gap-3 border-ink-500">
                                <span className="text-xs text-ink-400 flex items-center gap-1.5">
                                    <TriangleAlert className="w-3 h-3 text-gold-400" />
                                    Sanction. The reason is emailed to the user
                                </span>
                                {u!.sanction?.active ? (
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm text-ink-200">
                                            Currently <span className="text-red-300">{u!.sanction.type}</span>: {u!.sanction.reason}
                                        </p>
                                        <Button
                                            variant="secondary"
                                            disabled={busy}
                                            className="self-start"
                                            onClick={() => run(() => adminFetch(`/api/admin/users/${uid}/sanction?reason=lifted+by+admin`, { method: "DELETE" }))}
                                        >
                                            <ShieldOff className="w-3.5 h-3.5" /> Lift sanction
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-wrap gap-2">
                                            <Select value={sanctionType} onChange={(e) => setSanctionType(e.target.value)}>
                                                <option value="warn">Warn (record only)</option>
                                                <option value="mute">Mute (no posting)</option>
                                                <option value="suspend">Suspend (no sign-in)</option>
                                                <option value="ban">Ban (permanent)</option>
                                            </Select>
                                            {(sanctionType === "mute" || sanctionType === "suspend") && (
                                                <div className="flex items-center gap-1.5">
                                                    <Input
                                                        value={sanctionDays}
                                                        onChange={(e) => setSanctionDays(e.target.value)}
                                                        className="w-16 text-center"
                                                        inputMode="numeric"
                                                    />
                                                    <span className="text-xs text-ink-500">days</span>
                                                </div>
                                            )}
                                        </div>
                                        <Textarea
                                            rows={3}
                                            value={sanctionReason}
                                            onChange={(e) => setSanctionReason(e.target.value)}
                                            placeholder="Why? This exact text is sent to the user."
                                        />
                                        <Button variant="danger" onClick={applySanction} disabled={busy || !sanctionReason.trim()} className="self-start">
                                            {busy ? <Spinner className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                            Apply sanction
                                        </Button>
                                    </>
                                )}
                            </Panel>
                        )}

                        {/* Data rights */}
                        {can("users.delete") && (
                            <Panel className="p-4 flex flex-col gap-3 border-red-500/20">
                                <span className="text-xs text-ink-400">Data rights</span>
                                <div className="flex flex-wrap gap-2">
                                    <a
                                        href={`/api/admin/users/${uid}/export`}
                                        onClick={async (e) => {
                                            // The export route needs the bearer token, so fetch it
                                            // here and hand the browser a blob instead of a bare link.
                                            e.preventDefault();
                                            const res = await adminFetch(`/api/admin/users/${uid}/export`);
                                            if (!res.ok) {
                                                setError("Export failed");
                                                return;
                                            }
                                            const blob = await res.blob();
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement("a");
                                            a.href = url;
                                            a.download = `veinote-export-${uid}.json`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }}
                                        className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-ink-500 text-ink-200 hover:bg-ink-700 transition-colors"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Export data (GDPR)
                                    </a>
                                    <Button
                                        variant="danger"
                                        disabled={busy}
                                        onClick={() => {
                                            const reason = window.prompt(
                                                `Permanently delete ${u!.email}?\n\nThe account and profile are removed and their community posts are anonymised. This cannot be undone.\n\nReason (recorded in the audit log):`,
                                            );
                                            if (reason === null) return;
                                            run(() => adminFetch(`/api/admin/users/${uid}?reason=${encodeURIComponent(reason)}`, { method: "DELETE" }))
                                                .then(onClose);
                                        }}
                                    >
                                        Delete account
                                    </Button>
                                </div>
                            </Panel>
                        )}
                    </div>
                )}
            </aside>
        </div>
    );
}

/** Firebase's provider ids, in the words an admin would use. */
function describeProviders(providers: string[] | undefined): string {
    if (!providers || providers.length === 0) return "–";
    const names: Record<string, string> = {
        "google.com": "Google",
        password: "Email + password",
        "apple.com": "Apple",
        "facebook.com": "Facebook",
    };
    return providers.map((p) => names[p] || p).join(", ");
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "red" }) {
    return (
        <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-ink-850 border border-ink-600">
            <span className="text-[11px] text-ink-500">{label}</span>
            {/* break-words: an email address as a value overflows a grid cell otherwise. */}
            <span className={`text-sm break-words ${tone === "red" ? "text-red-300" : "text-ink-100"}`}>{value}</span>
        </div>
    );
}
