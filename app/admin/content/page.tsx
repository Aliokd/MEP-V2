"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Eye, Archive } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, Badge, Button, Select, EmptyState, SkeletonRows, Spinner, timeAgo } from "../components/ui";
import {
    LOCALES, LOCALE_LABELS, localeCompleteness, pickLocale,
    type ContentStatus, type LocalizedText,
} from "@/lib/content";
import ContentEditor from "./ContentEditor";

type Tab = "chapters" | "lessons" | "ideas" | "songs";

const TABS: { id: Tab; label: string; description: string }[] = [
    { id: "chapters", label: "Chapters", description: "The top-level sections of the Learn curriculum." },
    { id: "lessons", label: "Lessons", description: "Individual lessons, their video, order and prerequisites." },
    { id: "ideas", label: "Bank of Ideas", description: "Prompts shown in Learn, by category." },
    { id: "songs", label: "Practice songs", description: "The practice library, including its rights position." },
];

export interface ContentItem {
    id: string;
    status: ContentStatus;
    order?: number;
    title?: LocalizedText | string;
    description?: LocalizedText;
    summary?: LocalizedText;
    whyItHelps?: LocalizedText;
    example?: LocalizedText;
    category?: string;
    chapterId?: string;
    videoUrl?: string;
    posterUrl?: string | null;
    durationSeconds?: number;
    artist?: string;
    audioUrl?: string;
    coverUrl?: string | null;
    rights?: { licence?: string | null; holder?: string | null; notes?: string | null };
    updatedAt?: number | null;
    updatedByEmail?: string | null;
    [key: string]: any;
}

const STATUS_TONE: Record<string, "neutral" | "green" | "gold" | "blue"> = {
    published: "green",
    draft: "gold",
    scheduled: "blue",
    archived: "neutral",
};

export default function ContentPage() {
    const { adminFetch, can } = useAdmin();
    const [tab, setTab] = useState<Tab>("chapters");
    const [items, setItems] = useState<ContentItem[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");
    const [editing, setEditing] = useState<ContentItem | "new" | null>(null);

    const load = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            const params = statusFilter ? `?status=${statusFilter}` : "";
            const res = await adminFetch(`/api/admin/content/${tab}${params}`);
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load content");
            setItems((await res.json()).items);
        } catch (err: any) {
            setError(err.message);
            setItems([]);
        } finally {
            setRefreshing(false);
        }
    }, [adminFetch, tab, statusFilter]);

    useEffect(() => {
        setItems(null);
        load();
    }, [load]);

    // Translation coverage across the whole tab — the number that tells you
    // whether Norwegian and Swedish readers are getting the same product.
    const coverage = useMemo(() => {
        if (!items || items.length === 0) return null;
        const totals = { en: 0, no: 0, sv: 0 };
        let counted = 0;
        for (const item of items) {
            const localized = [item.title, item.description, item.summary, item.whyItHelps, item.example]
                .filter((f) => f && typeof f === "object") as LocalizedText[];
            if (localized.length === 0) continue;
            const c = localeCompleteness(localized);
            LOCALES.forEach((l) => { totals[l] += c[l]; });
            counted += 1;
        }
        if (counted === 0) return null;
        return LOCALES.reduce((acc, l) => ({ ...acc, [l]: Math.round((totals[l] / counted) * 100) }), {} as Record<string, number>);
    }, [items]);

    const activeTab = TABS.find((tabDef) => tabDef.id === tab)!;

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Content"
                description="Learn, Bank of Ideas and Practice are all edited here. Nothing reaches readers until it is published."
                action={
                    <div className="flex items-center gap-2">
                        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">All statuses</option>
                            <option value="draft">Drafts</option>
                            <option value="published">Published</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="archived">Archived</option>
                        </Select>
                        <Button onClick={load} disabled={refreshing} size="sm">
                            {refreshing ? <Spinner className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Refresh
                        </Button>
                        {can("content.write") && (
                            <Button variant="primary" size="sm" onClick={() => setEditing("new")}>
                                <Plus className="w-3.5 h-3.5" /> New
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="flex flex-wrap items-center gap-1.5 border-b border-ink-600 pb-3">
                {TABS.map((tabDef) => (
                    <button
                        key={tabDef.id}
                        onClick={() => setTab(tabDef.id)}
                        className={`px-3.5 py-1.5 rounded-full text-sm transition-colors ${
                            tab === tabDef.id
                                ? "bg-ink-700 text-ink-100"
                                : "text-ink-400 hover:text-ink-100 hover:bg-ink-800"
                        }`}
                    >
                        {tabDef.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
                <p className="text-xs text-ink-500">{activeTab.description}</p>
                {coverage && (
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-[11px] text-ink-500">Translated</span>
                        {LOCALES.map((l) => (
                            <Badge key={l} tone={coverage[l] === 100 ? "green" : coverage[l] > 0 ? "gold" : "neutral"}>
                                {LOCALE_LABELS[l]} {coverage[l]}%
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            {error && (
                <Panel className="p-4 border-red-500/30">
                    <p className="text-sm text-red-300">{error}</p>
                </Panel>
            )}

            <Panel className="overflow-hidden">
                {!items ? (
                    <SkeletonRows rows={6} />
                ) : items.length === 0 ? (
                    <EmptyState
                        title="Nothing here yet"
                        description={
                            tab === "ideas" || tab === "songs"
                                ? "Run scripts/migrate-content.mjs --commit to import the content that currently ships in code, or create one from scratch."
                                : "Create a chapter or lesson to get started."
                        }
                        action={can("content.write") ? <Button onClick={() => setEditing("new")}><Plus className="w-3.5 h-3.5" /> New</Button> : undefined}
                    />
                ) : (
                    <ul className="divide-y divide-ink-600">
                        {items.map((item) => {
                            const localized = [item.title, item.description, item.summary, item.whyItHelps, item.example]
                                .filter((f) => f && typeof f === "object") as LocalizedText[];
                            const completeness = localized.length > 0 ? localeCompleteness(localized) : null;
                            const label = typeof item.title === "string" ? item.title : pickLocale(item.title, "en");

                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={() => setEditing(item)}
                                        className="w-full text-left px-4 py-3 hover:bg-ink-800 transition-colors flex items-center gap-3"
                                    >
                                        <span className="text-xs text-ink-600 tabular-nums w-6 shrink-0">{item.order ?? "—"}</span>
                                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                            <span className="text-sm text-ink-100 truncate">{label || item.id}</span>
                                            <span className="text-[11px] text-ink-500 truncate">
                                                {item.artist && `${item.artist} · `}
                                                {item.category && `${item.category} · `}
                                                {item.updatedAt ? `edited ${timeAgo(item.updatedAt)}` : "never edited"}
                                                {item.updatedByEmail && ` by ${item.updatedByEmail}`}
                                            </span>
                                        </div>
                                        {tab === "songs" && !item.rights?.licence && (
                                            <Badge tone="red">no licence</Badge>
                                        )}
                                        {completeness && (
                                            <div className="hidden sm:flex items-center gap-1 shrink-0">
                                                {LOCALES.map((l) => (
                                                    <span
                                                        key={l}
                                                        title={`${LOCALE_LABELS[l]} ${Math.round(completeness[l] * 100)}%`}
                                                        className={`w-1.5 h-4 rounded-full ${
                                                            completeness[l] === 1
                                                                ? "bg-green-500"
                                                                : completeness[l] > 0
                                                                  ? "bg-gold-500"
                                                                  : "bg-ink-600"
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        <Badge tone={STATUS_TONE[item.status] || "neutral"}>{item.status}</Badge>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Panel>

            <p className="text-[11px] text-ink-500 flex items-center gap-1.5">
                <Eye className="w-3 h-3" />
                Readers only ever see published rows.
                <Archive className="w-3 h-3 ml-2" />
                Removing content archives it rather than deleting — lesson progress records point at these ids.
            </p>

            {editing && (
                <ContentEditor
                    collection={tab}
                    item={editing === "new" ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); load(); }}
                />
            )}
        </div>
    );
}
