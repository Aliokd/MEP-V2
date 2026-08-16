"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, RefreshCw, Plus, Send, Pause, Play, TriangleAlert, Users, Eye } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, PanelHeader, Badge, Button, Input, Select, Textarea, EmptyState, SkeletonRows, Spinner, timeAgo } from "../components/ui";
import { LOCALES, LOCALE_LABELS } from "@/lib/content";

interface Campaign {
    id: string;
    name: string;
    subject: string;
    body: string;
    ctaLabel: string | null;
    ctaUrl: string | null;
    audience: { tiers: string[]; locales: string[] };
    status: string;
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
    cursor: string | null;
    createdByEmail: string;
    createdAt: number | null;
    lastError: string | null;
}

const TIERS = ["trial", "pro", "max", "comp"];

const STATUS_TONE: Record<string, "neutral" | "green" | "gold" | "red" | "blue"> = {
    draft: "gold",
    sending: "blue",
    paused: "gold",
    sent: "green",
    failed: "red",
};

export default function EmailPage() {
    const { adminFetch, can } = useAdmin();

    const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [composing, setComposing] = useState(false);

    // Composer
    const [name, setName] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [ctaLabel, setCtaLabel] = useState("");
    const [ctaUrl, setCtaUrl] = useState("");
    const [tiers, setTiers] = useState<string[]>([]);
    const [locales, setLocales] = useState<string[]>([]);
    const [preview, setPreview] = useState<{ audienceSize: number; capped: boolean; optedOut: number; html: string; testSentTo: string | null } | null>(null);
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState<string | null>(null);

    // Sending
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [progress, setProgress] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        try {
            const res = await adminFetch("/api/admin/email/campaigns");
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load campaigns");
            setCampaigns((await res.json()).campaigns);
        } catch (err: any) {
            setError(err.message);
            setCampaigns([]);
        }
    }, [adminFetch]);

    useEffect(() => {
        load();
    }, [load]);

    const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
        set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

    const runPreview = async (test: boolean) => {
        setBusy(true);
        setNote(null);
        try {
            const res = await adminFetch("/api/admin/email/preview", {
                method: "POST",
                body: JSON.stringify({ subject, body, ctaLabel, ctaUrl, audience: { tiers, locales }, test }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Preview failed");
            setPreview(data);
            if (data.testSentTo) setNote(`Test sent to ${data.testSentTo}.`);
        } catch (err: any) {
            setNote(err.message);
        } finally {
            setBusy(false);
        }
    };

    const saveDraft = async () => {
        setBusy(true);
        setNote(null);
        try {
            const res = await adminFetch("/api/admin/email/campaigns", {
                method: "POST",
                body: JSON.stringify({ name, subject, body, ctaLabel, ctaUrl, audience: { tiers, locales } }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not save");
            setComposing(false);
            setName(""); setSubject(""); setBody(""); setCtaLabel(""); setCtaUrl("");
            setTiers([]); setLocales([]); setPreview(null);
            await load();
        } catch (err: any) {
            setNote(err.message);
        } finally {
            setBusy(false);
        }
    };

    /**
     * Drives the batched sender to completion. Each request handles a slice and
     * says whether more remain — the loop lives here rather than on the server
     * because a single request would hit the 120s Cloud Run ceiling on any real
     * list. Closing the tab stops the loop; the campaign resumes from its cursor.
     */
    const runCampaign = async (campaign: Campaign) => {
        if (!window.confirm(
            `Send "${campaign.subject}" to everyone matching this audience?\n\n` +
            `This emails real people and cannot be recalled once it starts. ` +
            `You can pause it, but anything already sent has gone.`,
        )) return;

        setSendingId(campaign.id);
        setProgress("Starting…");
        let sent = 0;
        let failed = 0;

        try {
            for (let i = 0; i < 400; i++) {
                const res = await adminFetch(`/api/admin/email/campaigns/${campaign.id}/send`, { method: "POST" });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Send failed");

                if (data.done) {
                    setProgress(null);
                    setNote(`Finished: ${data.sent} sent, ${data.failed} failed.`);
                    break;
                }

                sent += data.batchSent;
                failed += data.batchFailed;
                setProgress(`${sent} sent${failed ? `, ${failed} failed` : ""}…`);
                await load();
            }
        } catch (err: any) {
            setNote(err.message);
            setProgress(null);
        } finally {
            setSendingId(null);
            await load();
        }
    };

    const pause = async (campaign: Campaign) => {
        await adminFetch(`/api/admin/email/campaigns/${campaign.id}/send`, { method: "PATCH" });
        await load();
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Email"
                description="Bulk email to Veinote users. Transactional mail — welcome, replies, moderation notices — is not sent from here and ignores unsubscribes."
                action={
                    <div className="flex items-center gap-2">
                        <Button onClick={load} size="sm">
                            <RefreshCw className="w-3.5 h-3.5" /> Refresh
                        </Button>
                        {can("announcements.write") && (
                            <Button variant="primary" size="sm" onClick={() => setComposing((v) => !v)}>
                                <Plus className="w-3.5 h-3.5" /> New campaign
                            </Button>
                        )}
                    </div>
                }
            />

            {error && (
                <Panel className="p-4 border-red-500/30">
                    <p className="text-sm text-red-300">{error}</p>
                </Panel>
            )}

            {note && (
                <Panel className="p-3.5">
                    <p className="text-xs text-ink-300">{note}</p>
                </Panel>
            )}

            {composing && (
                <Panel>
                    <PanelHeader title="New campaign" subtitle="Saved as a draft. Nothing sends until you press Send." />
                    <div className="p-5 flex flex-col gap-4">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs text-ink-400">Internal name</span>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="August beta update" />
                        </label>

                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs text-ink-400">Subject</span>
                            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                        </label>

                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs text-ink-400">Message</span>
                            <Textarea
                                rows={10}
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder={"Hi {{name}},\n\nBlank lines separate paragraphs.\n\nThanks for being here."}
                            />
                            <span className="text-[11px] text-ink-500">
                                <span className="font-mono">{"{{name}}"}</span> is replaced with the recipient&apos;s
                                name. Plain text — no HTML.
                            </span>
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs text-ink-400">Button label (optional)</span>
                                <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs text-ink-400">Button link</span>
                                <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://veinote.com/…" />
                            </label>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-xs text-ink-400 flex items-center gap-1.5">
                                <Users className="w-3 h-3" /> Audience — leave empty for everyone
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {TIERS.map((tier) => (
                                    <button
                                        key={tier}
                                        onClick={() => toggle(tiers, setTiers, tier)}
                                        className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                                            tiers.includes(tier)
                                                ? "border-green-500/40 bg-green-500/10 text-green-400"
                                                : "border-ink-600 text-ink-400 hover:text-ink-100"
                                        }`}
                                    >
                                        {tier}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {LOCALES.map((l) => (
                                    <button
                                        key={l}
                                        onClick={() => toggle(locales, setLocales, l)}
                                        className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                                            locales.includes(l)
                                                ? "border-green-500/40 bg-green-500/10 text-green-400"
                                                : "border-ink-600 text-ink-400 hover:text-ink-100"
                                        }`}
                                    >
                                        {LOCALE_LABELS[l]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {preview && (
                            <Panel className="p-4 flex flex-col gap-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge tone="blue">{preview.audienceSize} recipients{preview.capped ? "+" : ""}</Badge>
                                    {preview.optedOut > 0 && (
                                        <span className="text-[11px] text-ink-500">
                                            {preview.optedOut} opted out and are excluded
                                        </span>
                                    )}
                                </div>
                                <div className="max-h-80 overflow-y-auto rounded-xl bg-white">
                                    {/* Rendered by the same code that builds the real email. */}
                                    <iframe
                                        title="Email preview"
                                        srcDoc={preview.html}
                                        className="w-full h-80 border-0"
                                    />
                                </div>
                            </Panel>
                        )}

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-ink-600">
                            <Button onClick={() => runPreview(false)} disabled={busy || !subject.trim() || !body.trim()}>
                                {busy ? <Spinner className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                Preview & count
                            </Button>
                            <Button onClick={() => runPreview(true)} disabled={busy || !subject.trim() || !body.trim()}>
                                <Mail className="w-3.5 h-3.5" /> Send test to myself
                            </Button>
                            <Button variant="primary" onClick={saveDraft} disabled={busy || !subject.trim() || !body.trim()}>
                                Save as draft
                            </Button>
                            <Button variant="ghost" onClick={() => setComposing(false)}>Cancel</Button>
                        </div>
                    </div>
                </Panel>
            )}

            <Panel className="overflow-hidden">
                <PanelHeader title="Campaigns" />
                {!campaigns ? (
                    <SkeletonRows rows={4} />
                ) : campaigns.length === 0 ? (
                    <EmptyState
                        title="No campaigns yet"
                        description="A campaign is a one-off email to a group of users. Drafts are safe — nothing sends until you press Send."
                    />
                ) : (
                    <ul className="divide-y divide-ink-600">
                        {campaigns.map((c) => (
                            <li key={c.id} className="px-4 py-3.5 flex items-start gap-3">
                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge tone={STATUS_TONE[c.status] || "neutral"}>{c.status}</Badge>
                                        <span className="text-sm text-ink-100 truncate">{c.subject}</span>
                                    </div>
                                    <span className="text-[11px] text-ink-500">
                                        {c.sentCount} sent
                                        {c.failedCount > 0 && ` · ${c.failedCount} failed`}
                                        {" · "}
                                        {c.audience?.tiers?.length ? c.audience.tiers.join(", ") : "all tiers"}
                                        {" · created "}
                                        {timeAgo(c.createdAt)} by {c.createdByEmail}
                                    </span>
                                    {c.lastError && (
                                        <span className="text-[11px] text-red-300 flex items-start gap-1">
                                            <TriangleAlert className="w-3 h-3 shrink-0 mt-0.5" />
                                            {c.lastError}
                                        </span>
                                    )}
                                    {sendingId === c.id && progress && (
                                        <span className="text-[11px] text-blue-300">{progress}</span>
                                    )}
                                </div>

                                {can("announcements.send") && c.status !== "sent" && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        {sendingId === c.id ? (
                                            <Button size="sm" onClick={() => pause(c)}>
                                                <Pause className="w-3.5 h-3.5" /> Pause
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="primary" onClick={() => runCampaign(c)}>
                                                {c.cursor ? <Play className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                                                {c.cursor ? "Resume" : "Send"}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            <p className="text-[11px] text-ink-500 leading-relaxed max-w-2xl">
                Sending runs in batches so it survives the server&apos;s request limit, and records how far it got.
                Closing this tab stops it; pressing Resume continues from the same place rather than starting over,
                so nobody is emailed twice. Every campaign email carries an unsubscribe link, and anyone who has
                used one is excluded automatically.
            </p>
        </div>
    );
}
