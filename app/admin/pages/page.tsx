"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, ExternalLink, CornerDownRight, Code2, Lock } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, Badge, Button, Select, EmptyState, SkeletonRows, Spinner, timeAgo } from "../components/ui";
import { LOCALES, LOCALE_LABELS, localeCompleteness, pickLocale, type SitePage } from "@/lib/content";
import PageEditor from "./PageEditor";
import FaqEditor, { type FaqRow } from "./FaqEditor";

type Tab = "pages" | "faqs";

const STATUS_TONE: Record<string, "neutral" | "green" | "gold" | "blue"> = {
    published: "green",
    draft: "gold",
    scheduled: "blue",
    archived: "neutral",
};

/**
 * Routes that are still built in code rather than the CMS. Listed so an admin
 * looking for an existing page finds it here and learns why it can't be edited,
 * rather than concluding the list is broken.
 */
const CODE_ROUTES: { path: string; label: string; why: string }[] = [
    {
        path: "/",
        label: "Homepage",
        why: "Bespoke layout — hero, sections and animations. The Q&A on it is editable under the Q&A tab.",
    },
    {
        path: "/about",
        label: "About",
        why: "Bespoke layout. Its wording lives in the locale files.",
    },
];

export default function ManagePagesPage() {
    const { adminFetch, can } = useAdmin();
    const [tab, setTab] = useState<Tab>("pages");

    const [pages, setPages] = useState<SitePage[] | null>(null);
    const [faqs, setFaqs] = useState<FaqRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");

    const [editingPage, setEditingPage] = useState<SitePage | "new" | null>(null);
    const [editingFaq, setEditingFaq] = useState<FaqRow | "new" | null>(null);

    const load = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            const params = statusFilter ? `?status=${statusFilter}` : "";
            const endpoint = tab === "pages" ? "pages" : "faqs";
            const res = await adminFetch(`/api/admin/content/${endpoint}${params}`);
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load");
            const items = (await res.json()).items;
            if (tab === "pages") setPages(items);
            else setFaqs(items);
        } catch (err: any) {
            setError(err.message);
            if (tab === "pages") setPages([]);
            else setFaqs([]);
        } finally {
            setRefreshing(false);
        }
    }, [adminFetch, tab, statusFilter]);

    useEffect(() => {
        load();
    }, [load]);

    /** Top-level pages each followed by their children; orphans last. */
    const ordered = useMemo(() => {
        if (!pages) return [];
        const byOrder = [...pages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const rows: { page: SitePage; depth: number }[] = [];

        byOrder.filter((p) => !p.parentId).forEach((top) => {
            rows.push({ page: top, depth: 0 });
            byOrder.filter((p) => p.parentId === top.slug).forEach((child) => rows.push({ page: child, depth: 1 }));
        });

        const placed = new Set(rows.map((r) => r.page.id));
        byOrder.filter((p) => !placed.has(p.id)).forEach((orphan) => rows.push({ page: orphan, depth: 0 }));
        return rows;
    }, [pages]);

    const list = tab === "pages" ? pages : faqs;

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Pages"
                description="Website pages and the homepage Q&A. Published items go live immediately."
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
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => (tab === "pages" ? setEditingPage("new") : setEditingFaq("new"))}
                            >
                                <Plus className="w-3.5 h-3.5" /> {tab === "pages" ? "New page" : "New question"}
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="flex flex-wrap items-center gap-1.5 border-b border-ink-600 pb-3">
                {([
                    { id: "pages" as Tab, label: "Pages" },
                    { id: "faqs" as Tab, label: "Q&A" },
                ]).map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-3.5 py-1.5 rounded-full text-sm transition-colors ${
                            tab === t.id ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-100 hover:bg-ink-800"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {error && (
                <Panel className="p-4 border-red-500/30">
                    <p className="text-sm text-red-300">{error}</p>
                </Panel>
            )}

            <Panel className="overflow-hidden">
                {!list ? (
                    <SkeletonRows rows={5} />
                ) : tab === "pages" ? (
                    ordered.length === 0 ? (
                        <EmptyState
                            title="No pages yet"
                            description="Run scripts/seed-site-pages.mjs --commit to import the privacy policy, or create one from scratch."
                            action={can("content.write") ? <Button onClick={() => setEditingPage("new")}><Plus className="w-3.5 h-3.5" /> New page</Button> : undefined}
                        />
                    ) : (
                        <ul className="divide-y divide-ink-600">
                            {ordered.map(({ page, depth }) => {
                                const completeness = localeCompleteness([page.title, page.description, page.body]);
                                return (
                                    <li key={page.id}>
                                        <div className="flex items-center gap-3 px-4 py-3 hover:bg-ink-800 transition-colors">
                                            <button
                                                onClick={() => setEditingPage(page)}
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
                                                            completeness[l] === 1 ? "bg-green-500" : completeness[l] > 0 ? "bg-gold-500" : "bg-ink-600"
                                                        }`}
                                                    />
                                                ))}
                                            </div>

                                            <Badge tone={STATUS_TONE[page.status] || "neutral"}>{page.status}</Badge>

                                            {page.status === "published" && (
                                                <a href={`/${page.slug}`} target="_blank" rel="noreferrer noopener" title="View live" className="text-ink-500 hover:text-ink-100 shrink-0">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )
                ) : faqs && faqs.length === 0 ? (
                    <EmptyState
                        title="No questions yet"
                        description="Run scripts/seed-site-pages.mjs --commit to import the four questions already on the homepage, or write a new one."
                        action={can("content.write") ? <Button onClick={() => setEditingFaq("new")}><Plus className="w-3.5 h-3.5" /> New question</Button> : undefined}
                    />
                ) : (
                    <ul className="divide-y divide-ink-600">
                        {(faqs || []).map((faq) => {
                            const completeness = localeCompleteness([faq.question, faq.answer]);
                            return (
                                <li key={faq.id}>
                                    <button
                                        onClick={() => setEditingFaq(faq)}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-ink-800 transition-colors text-left"
                                    >
                                        <span className="text-xs text-ink-600 tabular-nums w-6 shrink-0">{faq.order}</span>
                                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                            <span className="text-sm text-ink-100 truncate">{pickLocale(faq.question, "en")}</span>
                                            <span className="text-[11px] text-ink-500 truncate">
                                                {pickLocale(faq.answer, "en")}
                                            </span>
                                        </div>
                                        <div className="hidden sm:flex items-center gap-1 shrink-0">
                                            {LOCALES.map((l) => (
                                                <span
                                                    key={l}
                                                    title={`${LOCALE_LABELS[l]} ${Math.round(completeness[l] * 100)}%`}
                                                    className={`w-1.5 h-4 rounded-full ${
                                                        completeness[l] === 1 ? "bg-green-500" : completeness[l] > 0 ? "bg-gold-500" : "bg-ink-600"
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <Badge tone={STATUS_TONE[faq.status] || "neutral"}>{faq.status}</Badge>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Panel>

            {tab === "pages" && (
                <Panel className="overflow-hidden">
                    <div className="px-4 py-3 border-b border-ink-600 flex items-center gap-2">
                        <Code2 className="w-3.5 h-3.5 text-ink-500" />
                        <span className="text-sm text-ink-200">Built in code</span>
                        <span className="text-[11px] text-ink-500 ml-auto">not editable here</span>
                    </div>
                    <ul className="divide-y divide-ink-600">
                        {CODE_ROUTES.map((route) => (
                            <li key={route.path} className="flex items-center gap-3 px-4 py-3">
                                <Lock className="w-3.5 h-3.5 text-ink-600 shrink-0" />
                                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                    <span className="text-sm text-ink-300">{route.label}</span>
                                    <span className="text-[11px] text-ink-500">{route.path} — {route.why}</span>
                                </div>
                                <a href={route.path} target="_blank" rel="noreferrer noopener" className="text-ink-500 hover:text-ink-100 shrink-0">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </Panel>
            )}

            <p className="text-[11px] text-ink-500 leading-relaxed max-w-2xl">
                Pages render at <span className="text-ink-400">/{"{slug}"}</span>, with Norwegian and Swedish at
                <span className="text-ink-400"> /no/{"{slug}"}</span> and <span className="text-ink-400">/sv/{"{slug}"}</span>.
                Bodies are Markdown; raw HTML is stripped rather than rendered.
                <br />
                The privacy policy keeps its own layout: publish a page with the slug{" "}
                <span className="text-ink-400">privacy</span> and it takes over from the version built in code.
            </p>

            {editingPage && (
                <PageEditor
                    page={editingPage === "new" ? null : editingPage}
                    allPages={pages || []}
                    onClose={() => setEditingPage(null)}
                    onSaved={() => { setEditingPage(null); load(); }}
                />
            )}

            {editingFaq && (
                <FaqEditor
                    faq={editingFaq === "new" ? null : editingFaq}
                    onClose={() => setEditingFaq(null)}
                    onSaved={() => { setEditingFaq(null); load(); }}
                />
            )}
        </div>
    );
}
