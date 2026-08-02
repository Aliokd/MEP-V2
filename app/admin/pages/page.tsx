"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, ExternalLink, CornerDownRight } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, Badge, Button, Select, EmptyState, SkeletonRows, Spinner, timeAgo } from "../components/ui";
import { LOCALES, LOCALE_LABELS, localeCompleteness, pickLocale, type SitePage } from "@/lib/content";
import PageEditor from "./PageEditor";

const STATUS_TONE: Record<string, "neutral" | "green" | "gold" | "blue"> = {
    published: "green",
    draft: "gold",
    scheduled: "blue",
    archived: "neutral",
};

export default function ManagePagesPage() {
    const { adminFetch, can } = useAdmin();
    const [pages, setPages] = useState<SitePage[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");
    const [editing, setEditing] = useState<SitePage | "new" | null>(null);

    const load = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            const params = statusFilter ? `?status=${statusFilter}` : "";
            const res = await adminFetch(`/api/admin/content/pages${params}`);
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load pages");
            setPages((await res.json()).items);
        } catch (err: any) {
            setError(err.message);
            setPages([]);
        } finally {
            setRefreshing(false);
        }
    }, [adminFetch, statusFilter]);

    useEffect(() => {
        load();
    }, [load]);

    /**
     * Flattens the one-level hierarchy into display order: each top-level page
     * followed by its children. Orphans (parent archived or deleted) surface at
     * the end rather than disappearing from the list.
     */
    const ordered = useMemo(() => {
        if (!pages) return [];
        const byOrder = [...pages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const tops = byOrder.filter((p) => !p.parentId);
        const rows: { page: SitePage; depth: number }[] = [];

        tops.forEach((top) => {
            rows.push({ page: top, depth: 0 });
            byOrder
                .filter((p) => p.parentId === top.slug)
                .forEach((child) => rows.push({ page: child, depth: 1 }));
        });

        const placed = new Set(rows.map((r) => r.page.id));
        byOrder.filter((p) => !placed.has(p.id)).forEach((orphan) => rows.push({ page: orphan, depth: 0 }));

        return rows;
    }, [pages]);

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Pages"
                description="Standalone website pages — privacy, terms, and anything else editorial. Published pages go live at veinote.com/{slug}."
                action={
                    <div className="flex items-center gap-2">
                        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">All statuses</option>
                            <option value="draft">Drafts</option>
                            <option value="published">Published</option>
                            <option value="archived">Archived</option>
                        </Select>
                        <Button onClick={load} disabled={refreshing} size="sm">
                            {refreshing ? <Spinner className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Refresh
                        </Button>
                        {can("content.write") && (
                            <Button variant="primary" size="sm" onClick={() => setEditing("new")}>
                                <Plus className="w-3.5 h-3.5" /> New page
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
                {!pages ? (
                    <SkeletonRows rows={5} />
                ) : ordered.length === 0 ? (
                    <EmptyState
                        title="No pages yet"
                        description="Create one for your terms and conditions, cookie policy, or anything else that needs its own URL."
                        action={
                            can("content.write") ? (
                                <Button onClick={() => setEditing("new")}>
                                    <Plus className="w-3.5 h-3.5" /> New page
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <ul className="divide-y divide-ink-600">
                        {ordered.map(({ page, depth }) => {
                            const completeness = localeCompleteness([page.title, page.description, page.body]);
                            return (
                                <li key={page.id}>
                                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-ink-800 transition-colors">
                                        <button
                                            onClick={() => setEditing(page)}
                                            className="flex items-center gap-2 min-w-0 flex-1 text-left"
                                            style={{ paddingLeft: depth * 20 }}
                                        >
                                            {depth > 0 && <CornerDownRight className="w-3.5 h-3.5 text-ink-600 shrink-0" />}
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                <span className="text-sm text-ink-100 truncate">
                                                    {pickLocale(page.title, "en") || page.slug}
                                                </span>
                                                <span className="text-[11px] text-ink-500 truncate">
                                                    /{page.slug}
                                                    {page.updatedAt ? ` · edited ${timeAgo(page.updatedAt)}` : " · never edited"}
                                                    {page.updatedByEmail && ` by ${page.updatedByEmail}`}
                                                </span>
                                            </div>
                                        </button>

                                        {page.showInFooter && <Badge tone="neutral">footer</Badge>}

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

                                        <Badge tone={STATUS_TONE[page.status] || "neutral"}>{page.status}</Badge>

                                        {page.status === "published" && (
                                            <a
                                                href={`/${page.slug}`}
                                                target="_blank"
                                                rel="noreferrer noopener"
                                                title="View live"
                                                className="text-ink-500 hover:text-ink-100 shrink-0"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Panel>

            <p className="text-[11px] text-ink-500 leading-relaxed max-w-2xl">
                Pages render at <span className="text-ink-400">/{"{slug}"}</span>, with Norwegian and Swedish at
                <span className="text-ink-400"> /no/{"{slug}"}</span> and <span className="text-ink-400">/sv/{"{slug}"}</span>.
                Bodies are written in Markdown; raw HTML is stripped rather than rendered.
                <br />
                <span className="text-gold-300">/about</span> and <span className="text-gold-300">/privacy</span> are still
                built as code routes — a page using either slug won&apos;t take effect until that route is removed.
            </p>

            {editing && (
                <PageEditor
                    page={editing === "new" ? null : editing}
                    allPages={pages || []}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); load(); }}
                />
            )}
        </div>
    );
}
