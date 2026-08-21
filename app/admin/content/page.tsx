"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Eye, Archive, Upload, Download } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, Badge, Button, Select, EmptyState, SkeletonRows, Spinner, timeAgo } from "../components/ui";
import {
    LOCALES, LOCALE_LABELS, localeCompleteness, pickLocale,
    type ContentStatus, type LocalizedText,
} from "@/lib/content";
import ContentEditor from "./ContentEditor";
import BulkIdeasDialog from "./BulkIdeasDialog";

type Tab = "chapters" | "lessons" | "ideas" | "songs";
type SectionId = "create" | "learn" | "practice" | "connect";

const TABS: { id: Tab; label: string; description: string }[] = [
    { id: "chapters", label: "Chapters", description: "The top-level sections of the Learn curriculum." },
    { id: "lessons", label: "Lessons", description: "Individual lessons, their video, order and prerequisites." },
    { id: "ideas", label: "Bank of Ideas", description: "Prompts shown in Learn, by category." },
    { id: "songs", label: "Practice songs", description: "The library Practice 1 works through, and its rights position." },
];

/**
 * Grouped by the part of the platform the content appears in, because that is
 * how it gets asked about: people say "the Practice songs" and "the Learn
 * videos", not "the practice_songs collection".
 *
 * Two of the four hold nothing yet. They are listed rather than hidden because
 * their emptiness is itself the answer to "where do I edit the canvas?" — a
 * section that says where that content really lives beats someone concluding
 * the console has lost it.
 */
const SECTIONS: { id: SectionId; label: string; blurb: string; tabs: Tab[] }[] = [
    { id: "create", label: "Create", blurb: "The songwriting canvas.", tabs: [] },
    {
        id: "learn",
        label: "Learn",
        blurb: "The curriculum, its videos, and the cards in the Bank of Ideas.",
        tabs: ["chapters", "lessons", "ideas"],
    },
    { id: "practice", label: "Practice", blurb: "The songs each practice works through.", tabs: ["songs"] },
    { id: "connect", label: "Connect", blurb: "The community feed.", tabs: [] },
];

/** What to say in a section that holds no editable content. */
const EMPTY_SECTION: Record<string, { title: string; description: string; href?: string; hrefLabel?: string }> = {
    create: {
        title: "The canvas has no authored content",
        description:
            "Everything in Create is written by the songwriter. The one authored thing it shows — the cards that can be dropped into a lyric flow — is the Bank of Ideas, under Learn.",
    },
    connect: {
        title: "Connect is written by its members",
        description:
            "There is nothing to publish into the feed. Taking a post down, or seeing what has been taken down, is moderation rather than editing.",
        href: "/admin/community",
        hrefLabel: "Open Community",
    },
};

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
    const [section, setSection] = useState<SectionId>("learn");
    const [tab, setTab] = useState<Tab>("chapters");
    const [items, setItems] = useState<ContentItem[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");
    const [editing, setEditing] = useState<ContentItem | "new" | null>(null);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importNote, setImportNote] = useState<string | null>(null);

    const load = useCallback(async () => {
        // A section with no collections has nothing to fetch, and asking for one
        // would request a collection name the API does not have.
        if (!SECTIONS.find((s) => s.id === section)?.tabs.length) {
            setItems([]);
            return;
        }
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
    }, [adminFetch, tab, statusFilter, section]);

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

    /** Brings the 38 cards that ship in app/platform/data/ideas.ts into the CMS. */
    const importFromCode = async (target: "ideas" | "songs") => {
        setImporting(true);
        setImportNote(null);
        try {
            const res = await adminFetch("/api/admin/content/import-from-code", {
                method: "POST",
                body: JSON.stringify({ target }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Import failed");
            setImportNote(
                data.imported.length > 0
                    ? `Imported ${data.imported.length} ${target === "songs" ? "songs" : "cards"}.`
                    : "Nothing to import — already in the CMS.",
            );
            await load();
        } catch (err: any) {
            setImportNote(err.message);
        } finally {
            setImporting(false);
        }
    };

    const ideasMissing = tab === "ideas" && items !== null && items.length === 0;
    const songsMissing = tab === "songs" && items !== null && items.length === 0;

    const activeSection = SECTIONS.find((s) => s.id === section)!;
    const sectionTabs = TABS.filter((tabDef) => activeSection.tabs.includes(tabDef.id));
    const activeTab = TABS.find((tabDef) => tabDef.id === tab)!;
    const emptySection = activeSection.tabs.length === 0 ? EMPTY_SECTION[activeSection.id] : null;

    /** Moving to a section lands on its first collection. */
    const chooseSection = (next: SectionId) => {
        setSection(next);
        const first = SECTIONS.find((s) => s.id === next)?.tabs[0];
        if (first) setTab(first);
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Content"
                description="Everything the platform shows, by the section it appears in. Nothing reaches anyone until it is published."
                action={
                    emptySection ? null : (
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
                        {tab === "ideas" && can("content.write") && (
                            <Button size="sm" onClick={() => setBulkOpen(true)}>
                                <Upload className="w-3.5 h-3.5" /> Bulk upload
                            </Button>
                        )}
                        {can("content.write") && (
                            <Button variant="primary" size="sm" onClick={() => setEditing("new")}>
                                <Plus className="w-3.5 h-3.5" /> New
                            </Button>
                        )}
                    </div>
                    )
                }
            />

            {/* The platform's own sections, in the order the sidebar shows them. */}
            <div className="flex flex-wrap items-center gap-1 border-b border-ink-600">
                {SECTIONS.map((sectionDef) => (
                    <button
                        key={sectionDef.id}
                        onClick={() => chooseSection(sectionDef.id)}
                        className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
                            section === sectionDef.id
                                ? "border-green-500 text-ink-100"
                                : "border-transparent text-ink-400 hover:text-ink-100"
                        }`}
                    >
                        {sectionDef.label}
                        {sectionDef.tabs.length === 0 && (
                            <span className="ml-1.5 text-[10px] text-ink-600">—</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Collections within the section. Hidden when there is only one:
                a single tab beside itself is decoration. */}
            {sectionTabs.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5">
                    {sectionTabs.map((tabDef) => (
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
            )}

            <div className="flex flex-wrap items-center gap-4">
                <p className="text-xs text-ink-500">
                    {emptySection ? activeSection.blurb : activeTab.description}
                </p>
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

            {songsMissing && can("content.publish") && (
                <Panel className="p-4 border-gold-500/30 bg-gold-500/5 flex flex-wrap items-center gap-3">
                    <Download className="w-4 h-4 text-gold-300 shrink-0" />
                    <p className="text-sm text-gold-200 flex-1 min-w-[240px]">
                        Practice is still playing the songs built into the app. Import them —
                        structure, timings and all — to manage them here. The moment one song is
                        published in the CMS it replaces the built-in list, so import before adding.
                    </p>
                    <Button variant="primary" size="sm" onClick={() => importFromCode("songs")} disabled={importing}>
                        {importing ? <Spinner className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                        Import from code
                    </Button>
                </Panel>
            )}

            {ideasMissing && can("content.publish") && (
                <Panel className="p-4 border-gold-500/30 bg-gold-500/5 flex flex-wrap items-center gap-3">
                    <Download className="w-4 h-4 text-gold-300 shrink-0" />
                    <p className="text-sm text-gold-200 flex-1 min-w-[240px]">
                        The Bank of Ideas is still the 38 cards built into the app. Import them to edit them
                        here — learners keep seeing them either way.
                    </p>
                    <Button variant="primary" size="sm" onClick={() => importFromCode("ideas")} disabled={importing}>
                        {importing ? <Spinner className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                        Import from code
                    </Button>
                </Panel>
            )}

            {importNote && (
                <Panel className="p-3.5">
                    <p className="text-xs text-ink-300">{importNote}</p>
                </Panel>
            )}

            {emptySection ? (
                <Panel className="overflow-hidden">
                    <EmptyState
                        title={emptySection.title}
                        description={emptySection.description}
                        action={
                            emptySection.href ? (
                                <a href={emptySection.href}>
                                    <Button>{emptySection.hrefLabel}</Button>
                                </a>
                            ) : (
                                <Button onClick={() => chooseSection("learn")}>Open Learn</Button>
                            )
                        }
                    />
                </Panel>
            ) : (
            <Panel className="overflow-hidden">
                {!items ? (
                    <SkeletonRows rows={6} />
                ) : items.length === 0 ? (
                    <EmptyState
                        title="Nothing here yet"
                        description={
                            tab === "ideas" || tab === "songs"
                                ? "Use “Import from code” above to bring in the cards that ship with the app, upload a batch, or create one from scratch."
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
            )}

            <p className="text-[11px] text-ink-500 flex items-center gap-1.5">
                <Eye className="w-3 h-3" />
                Readers only ever see published rows.
                <Archive className="w-3 h-3 ml-2" />
                Removing content archives it rather than deleting — lesson progress records point at these ids.
            </p>

            {bulkOpen && (
                <BulkIdeasDialog onClose={() => setBulkOpen(false)} onImported={load} />
            )}

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
