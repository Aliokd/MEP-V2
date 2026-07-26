"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, X } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, PanelHeader, Badge, Button, Input, Select, Textarea, EmptyState, SkeletonRows, Spinner, timeAgo } from "../components/ui";
import { LOCALES, LOCALE_LABELS, type LocalizedText, type Locale } from "@/lib/content";

interface Announcement {
    id: string;
    title: LocalizedText;
    body: LocalizedText;
    kind: string;
    audience: { tiers: string[]; locales: string[] };
    ctaLabel: string | null;
    ctaHref: string | null;
    status: string;
    publishAt: string | null;
    expiresAt: string | null;
    createdAt: number | null;
    createdByEmail: string | null;
}

const TIERS = ["trial", "pro", "max", "comp"];

export default function AnnouncementsPage() {
    const { adminFetch, can } = useAdmin();
    const [items, setItems] = useState<Announcement[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [composing, setComposing] = useState(false);

    const load = useCallback(async () => {
        setError(null);
        try {
            const res = await adminFetch("/api/admin/announcements");
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load announcements");
            setItems((await res.json()).announcements);
        } catch (err: any) {
            setError(err.message);
            setItems([]);
        }
    }, [adminFetch]);

    useEffect(() => {
        load();
    }, [load]);

    const setStatus = async (id: string, status: string) => {
        const res = await adminFetch("/api/admin/announcements", {
            method: "PATCH",
            body: JSON.stringify({ id, status }),
        });
        if (!res.ok) {
            setError((await res.json()).error || "Update failed");
            return;
        }
        load();
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Announcements"
                description="In-app banners, targeted by tier and language. Drafts are invisible to users until published."
                action={
                    <div className="flex items-center gap-2">
                        <Button onClick={load} size="sm">
                            <RefreshCw className="w-3.5 h-3.5" /> Refresh
                        </Button>
                        {can("announcements.write") && (
                            <Button variant="primary" size="sm" onClick={() => setComposing(true)}>
                                <Plus className="w-3.5 h-3.5" /> New
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

            <Panel className="overflow-hidden">
                {!items ? (
                    <SkeletonRows rows={4} />
                ) : items.length === 0 ? (
                    <EmptyState
                        title="No announcements"
                        description="Banners you publish here appear in the platform for the audience you choose."
                    />
                ) : (
                    <ul className="divide-y divide-ink-600">
                        {items.map((item) => (
                            <li key={item.id} className="px-4 py-3.5 flex items-start gap-3">
                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge tone={item.status === "published" ? "green" : "gold"}>{item.status}</Badge>
                                        <Badge tone="neutral">{item.kind}</Badge>
                                        <span className="text-sm text-ink-100 truncate">{item.title?.en}</span>
                                    </div>
                                    {item.body?.en && <p className="text-xs text-ink-400 line-clamp-2">{item.body.en}</p>}
                                    <span className="text-[11px] text-ink-500">
                                        {item.audience?.tiers?.length ? `tiers: ${item.audience.tiers.join(", ")}` : "all tiers"}
                                        {" · "}
                                        {item.audience?.locales?.length ? item.audience.locales.join(", ").toUpperCase() : "all languages"}
                                        {" · created "}
                                        {timeAgo(item.createdAt)}
                                        {item.createdByEmail && ` by ${item.createdByEmail}`}
                                    </span>
                                </div>
                                {can("announcements.write") && (
                                    <Button
                                        size="sm"
                                        variant={item.status === "published" ? "secondary" : "primary"}
                                        onClick={() => setStatus(item.id, item.status === "published" ? "draft" : "published")}
                                    >
                                        {item.status === "published" ? "Unpublish" : "Publish"}
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            {composing && (
                <Composer
                    onClose={() => setComposing(false)}
                    onSaved={() => { setComposing(false); load(); }}
                />
            )}
        </div>
    );
}

function Composer({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const { adminFetch } = useAdmin();
    const [locale, setLocale] = useState<Locale>("en");
    const [title, setTitle] = useState<LocalizedText>({});
    const [body, setBody] = useState<LocalizedText>({});
    const [kind, setKind] = useState("banner");
    const [tiers, setTiers] = useState<string[]>([]);
    const [locales, setLocales] = useState<string[]>([]);
    const [ctaLabel, setCtaLabel] = useState("");
    const [ctaHref, setCtaHref] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
        setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
    };

    const save = async (status: string) => {
        if (!title.en?.trim()) {
            setError("An English title is required — it's the fallback for every other language.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const res = await adminFetch("/api/admin/announcements", {
                method: "POST",
                body: JSON.stringify({
                    title, body, kind, status,
                    audience: { tiers, locales },
                    ctaLabel: ctaLabel || null,
                    ctaHref: ctaHref || null,
                }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Save failed");
            onSaved();
        } catch (err: any) {
            setError(err.message);
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />
            <aside className="relative w-full max-w-xl bg-ink-900 border-l border-ink-600 h-full overflow-y-auto">
                <header className="sticky top-0 bg-ink-900 border-b border-ink-600 px-5 py-4 flex items-center gap-3">
                    <h2 className="text-base text-ink-100 font-medium flex-1">New announcement</h2>
                    <button onClick={onClose} className="text-ink-500 hover:text-ink-100">
                        <X className="w-4 h-4" />
                    </button>
                </header>

                {error && <p className="mx-5 mt-4 text-sm text-red-300">{error}</p>}

                <div className="p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        {LOCALES.map((l) => (
                            <button
                                key={l}
                                onClick={() => setLocale(l)}
                                className={`px-3 py-1 rounded-full text-xs transition-colors flex items-center gap-1.5 ${
                                    locale === l ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-100"
                                }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${title[l]?.trim() ? "bg-green-500" : "bg-ink-500"}`} />
                                {LOCALE_LABELS[l]}
                            </button>
                        ))}
                    </div>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs text-ink-400">Title</span>
                        <Input value={title[locale] || ""} onChange={(e) => setTitle({ ...title, [locale]: e.target.value })} />
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs text-ink-400">Message</span>
                        <Textarea rows={3} value={body[locale] || ""} onChange={(e) => setBody({ ...body, [locale]: e.target.value })} />
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs text-ink-400">Kind</span>
                        <Select value={kind} onChange={(e) => setKind(e.target.value)}>
                            <option value="banner">Banner</option>
                            <option value="changelog">Changelog entry</option>
                            <option value="maintenance">Maintenance notice</option>
                        </Select>
                    </label>

                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-ink-400">Audience — leave empty for everyone</span>
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

                    <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs text-ink-400">Button label</span>
                            <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs text-ink-400">Button link</span>
                            <Input value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} />
                        </label>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-ink-600">
                        <Button onClick={() => save("draft")} disabled={saving}>
                            {saving && <Spinner className="w-3.5 h-3.5" />} Save draft
                        </Button>
                        <Button variant="primary" onClick={() => save("published")} disabled={saving}>
                            Publish now
                        </Button>
                    </div>
                </div>
            </aside>
        </div>
    );
}
