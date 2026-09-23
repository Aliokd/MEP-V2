"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Download, ShieldOff, Ban, Clock, TriangleAlert, RefreshCw, ExternalLink } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Badge, Button, Panel, Select, Spinner, Textarea, Input, timeAgo } from "../components/ui";
import { TIER_OPTIONS, TIER_TONE, tierLabel, statusLabel } from "@/lib/admin/tiers";
import ActivityPanel from "./ActivityPanel";
import { ACCESS_LABELS, PLAN_LABELS, type Entitlement } from "@/lib/entitlement";
import { PADDLE_ENVIRONMENT } from "@/lib/paddle/config";

interface Detail {
    user: {
        uid: string; name: string | null; email: string | null; tier: string | null;
        locale: string | null; answers: Record<string, string>;
        createdAt: number | null; lastActiveAt: number | null;
        /** Set only on accounts made from the console — the admin's email. */
        createdByAdmin: string | null;
        billing: Record<string, any> | null;
        sanction: Record<string, any> | null;
        signup: { method?: string; source?: string | null; verifiedAt?: string | null; attribution?: Record<string, string | null> | null } | null;
        golden: {
            ticket?: string;
            redeemedAt?: string;
            invites?: number;
            number?: number | null;
            status?: string | null;
            listed?: boolean | null;
            code?: string | null;
            origin?: string | null;
            pagePath?: string | null;
        } | null;
    };
    entitlement: Entitlement;
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
    const [billingNote, setBillingNote] = useState<string | null>(null);

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
                            {u?.signup?.method === "onboarding" && !u.signup.verifiedAt ? (
                                <Badge tone="neutral">Signup not finished</Badge>
                            ) : (
                                u?.tier && <Badge tone={TIER_TONE[u.tier] || "neutral"}>{tierLabel(u.tier)}</Badge>
                            )}
                            {detail && detail.entitlement.access === "expired" && <Badge tone="red">expired</Badge>}
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

                        {/* Billing: what the platform concludes, what Paddle holds, and the
                            hands on both. The tier is the console's grant; the subscription
                            is Paddle's record; the access line is the one answer the
                            platform acts on. */}
                        <Panel className="p-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-ink-400">Subscription</span>
                                <span className="text-xs text-ink-300">
                                    Access: <span className={detail.entitlement.access === "expired" ? "text-red-300" : "text-ink-100"}>{ACCESS_LABELS[detail.entitlement.access]}</span>
                                    {detail.entitlement.source === "granted" && " (granted)"}
                                    {detail.entitlement.source === "trial" && detail.entitlement.trialDaysLeft !== null && ` (${detail.entitlement.trialDaysLeft}d left)`}
                                    {detail.entitlement.source === "trial" && detail.entitlement.trialDaysLeft === null && " (no end date)"}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-sm text-ink-200">
                                <Badge tone={TIER_TONE[u!.tier || ""] || "neutral"}>{tierLabel(u!.tier)}</Badge>
                                {u!.billing?.trialEndsAt && (
                                    <span className="text-xs text-ink-400">
                                        trial ends {new Date(u!.billing.trialEndsAt).toLocaleDateString()}
                                    </span>
                                )}
                                {u!.golden?.ticket && (
                                    <Badge tone="blue">
                                        Golden ticket{u!.golden.number ? ` ${String(u!.golden.number).padStart(3, "0")}` : ""}
                                    </Badge>
                                )}
                            </div>

                            {/* The ticket behind a lifetime grant: the page to send the
                                person, the code on it, and whether it hangs on the wall. */}
                            {u!.golden?.ticket && (
                                <div className="rounded-xl bg-ink-800 border border-ink-600 p-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                                    <span className="text-ink-400">Golden</span>
                                    {u!.golden.pagePath && (
                                        <a href={u!.golden.pagePath} target="_blank" rel="noreferrer" className="text-ink-100 hover:underline">
                                            {u!.golden.pagePath}
                                        </a>
                                    )}
                                    {u!.golden.code && <code className="text-ink-300 tracking-wider">{u!.golden.code}</code>}
                                    {u!.golden.listed === false && <Badge tone="neutral">off the wall</Badge>}
                                    {u!.golden.status === "revoked" && <Badge tone="red">revoked</Badge>}
                                    <a href="/admin/golden" className="text-ink-400 hover:text-ink-200 ml-auto">Golden program</a>
                                </div>
                            )}

                            {/* Paddle's record, as last synced. Empty for an account that never
                                entered a card. */}
                            {u!.billing?.paddleSubscriptionId ? (
                                <div className="rounded-xl bg-ink-800 border border-ink-600 p-3 flex flex-col gap-2">
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <span className="text-ink-400">Paddle</span>
                                        <Badge tone={["active", "trialing"].includes(u!.billing.subscriptionStatus) ? "green" : u!.billing.subscriptionStatus === "past_due" ? "red" : "neutral"}>
                                            {statusLabel(u!.billing.subscriptionStatus) || "unknown"}
                                        </Badge>
                                        {u!.billing.plan && (
                                            <span className="text-ink-300">
                                                {PLAN_LABELS[u!.billing.plan as "pro" | "max"] || u!.billing.plan}{u!.billing.billingPeriod ? ` · ${u!.billing.billingPeriod}` : ""}
                                            </span>
                                        )}
                                        {u!.billing.scheduledChange?.action === "cancel" && u!.billing.scheduledChange.effectiveAt && (
                                            <Badge tone="red">cancels {new Date(u!.billing.scheduledChange.effectiveAt).toLocaleDateString()}</Badge>
                                        )}
                                    </div>
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                                        <Row k="Next charge" v={u!.billing.nextBilledAt ? new Date(u!.billing.nextBilledAt).toLocaleDateString() : "–"} />
                                        <Row k="Period ends" v={u!.billing.currentPeriodEnd ? new Date(u!.billing.currentPeriodEnd).toLocaleDateString() : "–"} />
                                        <Row k="Last synced" v={u!.billing.lastSyncedAt ? timeAgo(Date.parse(u!.billing.lastSyncedAt)) : u!.billing.lastEventAt ? timeAgo(Date.parse(u!.billing.lastEventAt)) : "never"} />
                                        <Row k="Customer" v={u!.billing.paddleCustomerId || "–"} />
                                    </dl>
                                    {can("users.write") && (
                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                disabled={busy}
                                                onClick={() => run(async () => {
                                                    const res = await adminFetch(`/api/admin/users/${uid}/billing`, { method: "POST", body: JSON.stringify({ action: "sync" }) });
                                                    if (res.ok) setBillingNote("Read back from Paddle.");
                                                    return res;
                                                })}
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" /> Refresh from Paddle
                                            </Button>
                                            {["active", "trialing", "past_due"].includes(u!.billing.subscriptionStatus) && !u!.billing.scheduledChange && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    disabled={busy}
                                                    onClick={() => {
                                                        if (!confirm("Cancel this subscription at the end of the paid period?")) return;
                                                        run(() => adminFetch(`/api/admin/users/${uid}/billing`, { method: "POST", body: JSON.stringify({ action: "cancel", when: "next_billing_period" }) }));
                                                    }}
                                                >
                                                    Cancel at period end
                                                </Button>
                                            )}
                                            {["active", "trialing", "past_due"].includes(u!.billing.subscriptionStatus) && (
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    disabled={busy}
                                                    onClick={() => {
                                                        if (!confirm("Cancel this subscription now? Access ends immediately and nothing is refunded from here.")) return;
                                                        run(() => adminFetch(`/api/admin/users/${uid}/billing`, { method: "POST", body: JSON.stringify({ action: "cancel", when: "immediately" }) }));
                                                    }}
                                                >
                                                    Cancel now
                                                </Button>
                                            )}
                                            <a
                                                href={`https://${PADDLE_ENVIRONMENT === "sandbox" ? "sandbox-" : ""}vendors.paddle.com/subscriptions-v2/${u!.billing.paddleSubscriptionId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-ink-400 hover:text-ink-100 inline-flex items-center gap-1 ml-auto"
                                            >
                                                Open in Paddle <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-ink-500">No Paddle subscription. This account has never entered a card.</p>
                            )}

                            {billingNote && <p className="text-xs text-green-400">{billingNote}</p>}

                            {can("users.write") && (
                                <div className="flex flex-col gap-2 mt-1">
                                    <span className="text-[11px] text-ink-500">
                                        Tier. On a paying account, Veinote and Veinote Pro change the plan in Paddle; on any other, they are grants without billing. Lifetime Pro also issues a golden ticket and puts it on the wall as taken; moving off it takes the ticket back.
                                    </span>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Select
                                            value={u!.tier || ""}
                                            onChange={(e) => run(() => adminFetch(`/api/admin/users/${uid}`, {
                                                method: "PATCH",
                                                body: JSON.stringify({ tier: e.target.value, ...(e.target.value === "trial" ? { trialDays: Number(trialDays) } : {}) }),
                                            }))}
                                            disabled={busy}
                                        >
                                            {u!.tier === "free" && <option value="free">Expired</option>}
                                            {TIER_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value} title={o.hint}>{o.label}</option>
                                            ))}
                                        </Select>
                                        <div className="flex items-center gap-1.5">
                                            <Input
                                                value={trialDays}
                                                onChange={(e) => setTrialDays(e.target.value)}
                                                className="w-16 text-center"
                                                inputMode="numeric"
                                                title="Days"
                                            />
                                            <Button
                                                size="sm"
                                                disabled={busy}
                                                title="Set the trial to end this many days from now, on the Trial tier"
                                                onClick={() => run(() => adminFetch(`/api/admin/users/${uid}`, {
                                                    method: "PATCH",
                                                    body: JSON.stringify({ tier: "trial", trialDays: Number(trialDays) }),
                                                }))}
                                            >
                                                <Clock className="w-3.5 h-3.5" /> Trial for {trialDays || "?"} days
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                disabled={busy}
                                                title="Add this many days to the current end date"
                                                onClick={() => run(() => adminFetch(`/api/admin/users/${uid}`, {
                                                    method: "PATCH",
                                                    body: JSON.stringify({ extendTrialDays: Number(trialDays) }),
                                                }))}
                                            >
                                                Extend
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Panel>

                        {/* Where they came from. The onboarding source and, when the
                            first page was an ad click, the campaign behind it. */}
                        {(u!.signup?.source || u!.signup?.attribution) && (
                            <Panel className="p-4 flex flex-col gap-2">
                                <span className="text-xs text-ink-400">Came from</span>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                    <Row k="Entry" v={u!.signup?.source || "–"} />
                                    <Row k="Landed on" v={u!.signup?.attribution?.landingPath || "–"} />
                                    <Row k="Source" v={u!.signup?.attribution?.utmSource || "–"} />
                                    <Row k="Medium" v={u!.signup?.attribution?.utmMedium || "–"} />
                                    <Row k="Campaign" v={u!.signup?.attribution?.utmCampaign || "–"} />
                                    <Row k="Content" v={u!.signup?.attribution?.utmContent || "–"} />
                                    <Row k="Referrer" v={u!.signup?.attribution?.referrer || "–"} />
                                    <Row k="Click id" v={u!.signup?.attribution?.clickId ? `${u!.signup.attribution.clickIdKind}: ${u!.signup.attribution.clickId}` : "–"} />
                                </dl>
                            </Panel>
                        )}

                        <ActivityPanel key={uid} uid={uid} />

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

function Row({ k, v }: { k: string; v: string }) {
    return (
        <div className="flex gap-2 min-w-0">
            <dt className="text-ink-500 shrink-0">{k}</dt>
            <dd className="text-ink-300 truncate">{v}</dd>
        </div>
    );
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
