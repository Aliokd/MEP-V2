"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, ExternalLink, CornerDownRight, Code2, Lock, Download } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, Badge, Button, Input, Select, EmptyState, SkeletonRows, Spinner, timeAgo } from "../components/ui";
import { BLOG_CATEGORIES, LOCALES, LOCALE_LABELS, appearsInFooter, blogCategory, isAlwaysInFooter, localeCompleteness, pageKind, pickLocale, type BlogCategory, type SitePage } from "@/lib/content";
import PageEditor from "./PageEditor";
import FaqEditor, { type FaqRow } from "./FaqEditor";
import CopyEditor, { type CopyRow } from "./CopyEditor";
import { listCopyKeys } from "@/lib/i18n-content";

type Tab = "legal" | "blog" | "faqs" | "copy";

/** Both page tabs read the same collection; `kind` decides which shelf a row is on. */
const PAGE_TABS: Tab[] = ["legal", "blog"];
const isPageTab = (tab: Tab) => PAGE_TABS.includes(tab);

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
        why: "Bespoke layout — hero, sections and animations. Its wording is editable under Site copy; the Q&A under the Q&A tab.",
    },
    {
        path: "/about",
        label: "About",
        why: "Bespoke layout. Its wording is editable under the Site copy tab.",
    },
];

export default function ManagePagesPage() {
    const { adminFetch, can } = useAdmin();
    const [tab, setTab] = useState<Tab>("legal");
    // Which shelf of the Blog tab is showing. Only consulted there.
    const [category, setCategory] = useState<BlogCategory>("marketing");

    const [pages, setPages] = useState<SitePage[] | null>(null);
    const [faqs, setFaqs] = useState<FaqRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");

    const [editingPage, setEditingPage] = useState<SitePage | "new" | null>(null);
    const [editingFaq, setEditingFaq] = useState<FaqRow | "new" | null>(null);
    const [copyOverrides, setCopyOverrides] = useState<Record<string, any> | null>(null);
    const [editingCopy, setEditingCopy] = useState<CopyRow | null>(null);
    const [copySearch, setCopySearch] = useState("");
    const [importing, setImporting] = useState(false);
    const [importNote, setImportNote] = useState<string | null>(null);

    const load = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            const params = statusFilter ? `?status=${statusFilter}` : "";
            const endpoint = isPageTab(tab) ? "pages" : tab === "faqs" ? "faqs" : "copy";
            const res = await adminFetch(`/api/admin/content/${endpoint}${params}`);
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load");
            const items = (await res.json()).items;
            if (isPageTab(tab)) setPages(items);
            else if (tab === "faqs") setFaqs(items);
            else {
                // Keyed by translation key so the list below can look each up in O(1).
                setCopyOverrides(Object.fromEntries(items.map((i: any) => [i.id, i])));
            }
        } catch (err: any) {
            setError(err.message);
            if (isPageTab(tab)) setPages([]);
            else if (tab === "faqs") setFaqs([]);
            else setCopyOverrides({});
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
        // One fetch feeds both page tabs; the shelf is a filter, not a query. A
        // page written before the split carries no `kind` and is a policy
        // document, so it belongs under Legal.
        const shelf = pages.filter(
            (p) => pageKind(p.kind) === tab && (tab !== "blog" || blogCategory(p.category) === category),
        );
        const byOrder = [...shelf].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const rows: { page: SitePage; depth: number }[] = [];

        byOrder.filter((p) => !p.parentId).forEach((top) => {
            rows.push({ page: top, depth: 0 });
            byOrder.filter((p) => p.parentId === top.slug).forEach((child) => rows.push({ page: child, depth: 1 }));
        });

        const placed = new Set(rows.map((r) => r.page.id));
        byOrder.filter((p) => !placed.has(p.id)).forEach((orphan) => rows.push({ page: orphan, depth: 0 }));
        return rows;
    }, [pages, tab, category]);


    /**
     * Editable strings, derived from the English locale file rather than a
     * hand-kept list — a new key in the code shows up here automatically.
     * Arrays are skipped by listCopyKeys, so the Q&A list can't appear twice.
     */
    const copyRows: CopyRow[] = useMemo(() => {
        if (!copyOverrides) return [];
        // "cookies" covers every word in the consent dialog and the settings
        // panel — the message, the three category descriptions, the buttons.
        // The switches themselves stay in code (they are what the categories
        // actually do), but what they SAY is copy like any other, and it is the
        // copy most likely to need a lawyer's wording at short notice.
        return listCopyKeys(["home", "about", "cookies"])
            .filter(({ key, value }) => {
                if (!copySearch.trim()) return true;
                const q = copySearch.trim().toLowerCase();
                return key.toLowerCase().includes(q) || value.toLowerCase().includes(q);
            })
            .map(({ key, value }) => {
                const stored = copyOverrides[key];
                return {
                    key,
                    codeValue: value,
                    override: stored?.value,
                    status: stored?.status,
                    updatedByEmail: stored?.updatedByEmail || null,
                };
            });
    }, [copyOverrides, copySearch]);

    const list = isPageTab(tab) ? pages : tab === "faqs" ? faqs : copyOverrides;

    /**
     * Pulls the copy still living in the locale files into the CMS. Runs on the
     * server, which already has Admin SDK credentials — so this needs no service
     * account key on anyone's machine.
     */
    const importFromCode = async () => {
        setImporting(true);
        setImportNote(null);
        try {
            const res = await adminFetch("/api/admin/content/import-from-code", {
                method: "POST",
                // "legal" covers every code-backed policy page — the privacy
                // policy and the cookie page — and skips whichever is already
                // here, so the button stays one button as more are added.
                body: JSON.stringify({ target: isPageTab(tab) ? "legal" : "faqs" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Import failed");

            setImportNote(
                data.imported.length > 0
                    ? `Imported ${data.imported.join(", ")}.`
                    : `Nothing to import — ${data.skipped.join("; ") || "already in the CMS"}.`,
            );
            await load();
        } catch (err: any) {
            setImportNote(err.message);
        } finally {
            setImporting(false);
        }
    };

    // The policy pages that ship their text in code and can be pulled in here.
    // Both keep working either way — the route falls back to the code copy —
    // so their absence from this list is a prompt, never an error.
    const CODE_BACKED_LEGAL: { slug: string; label: string }[] = [
        { slug: "privacy", label: "privacy policy" },
        { slug: "cookies", label: "cookie settings page" },
    ];
    const missingLegal =
        tab === "legal" && pages !== null
            ? CODE_BACKED_LEGAL.filter((p) => !pages.some((page) => page.slug === p.slug))
            : [];
    const faqsMissing = tab === "faqs" && faqs !== null && faqs.length === 0;

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
                        {can("content.write") && tab !== "copy" && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => (isPageTab(tab) ? setEditingPage("new") : setEditingFaq("new"))}
                            >
                                <Plus className="w-3.5 h-3.5" /> {isPageTab(tab) ? "New page" : "New question"}
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="flex flex-wrap items-center gap-1.5 border-b border-ink-600 pb-3">
                {([
                    { id: "legal" as Tab, label: "Legal" },
                    { id: "blog" as Tab, label: "Blog" },
                    { id: "faqs" as Tab, label: "Q&A" },
                    { id: "copy" as Tab, label: "Site copy" },
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

            {/* What a post is for, which is what decides who writes it. Shown only
                under Blog: the other tabs have no such division. */}
            {tab === "blog" && (
                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {BLOG_CATEGORIES.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setCategory(c.id)}
                                className={`px-3.5 py-1.5 rounded-full text-sm transition-colors ${
                                    category === c.id
                                        ? "bg-ink-700 text-ink-100"
                                        : "text-ink-400 hover:text-ink-100 hover:bg-ink-800"
                                }`}
                            >
                                {c.label}
                                <span className="ml-1.5 text-[11px] text-ink-500">
                                    {(pages || []).filter(
                                        (p) => pageKind(p.kind) === "blog" && blogCategory(p.category) === c.id,
                                    ).length}
                                </span>
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-ink-500">
                        {BLOG_CATEGORIES.find((c) => c.id === category)?.description}
                    </p>
                </div>
            )}

            {error && (
                <Panel className="p-4 border-red-500/30">
                    <p className="text-sm text-red-300">{error}</p>
                </Panel>
            )}

            {(missingLegal.length > 0 || faqsMissing) && can("content.publish") && (
                <Panel className="p-4 border-gold-500/30 bg-gold-500/5 flex flex-wrap items-center gap-3">
                    <Download className="w-4 h-4 text-gold-300 shrink-0" />
                    <p className="text-sm text-gold-200 flex-1 min-w-[240px]">
                        {missingLegal.length > 0
                            ? `The ${missingLegal.map((p) => p.label).join(" and the ")} ${
                                  missingLegal.length > 1 ? "are" : "is"
                              } still the version built in code. Import to edit ${
                                  missingLegal.length > 1 ? "them" : "it"
                              } here — the live page${missingLegal.length > 1 ? "s keep" : " keeps"} working either way.`
                            : "The homepage Q&A is still the version built in code. Import the four questions to edit them here."}
                    </p>
                    <Button variant="primary" size="sm" onClick={importFromCode} disabled={importing}>
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

            <Panel className="overflow-hidden">
                {!list ? (
                    <SkeletonRows rows={5} />
                ) : isPageTab(tab) ? (
                    ordered.length === 0 ? (
                        <EmptyState
                            title="No pages yet"
                            description="Use “Import from code” above to bring in the privacy policy, or create a page from scratch."
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

                                            {appearsInFooter(page) && <Badge tone="neutral">footer</Badge>}

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
                ) : tab === "copy" ? (
                    <>
                        <div className="p-4 border-b border-ink-600">
                            <Input
                                value={copySearch}
                                onChange={(e) => setCopySearch(e.target.value)}
                                placeholder="Search the text or the key"
                            />
                        </div>
                        <ul className="divide-y divide-ink-600">
                            {copyRows.map((row) => {
                                const edited = row.status === "published" && row.override;
                                const shown = edited ? (row.override?.en || row.codeValue) : row.codeValue;
                                return (
                                    <li key={row.key}>
                                        <button
                                            onClick={() => setEditingCopy(row)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-ink-800 transition-colors text-left"
                                        >
                                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                                <span className="text-sm text-ink-100 line-clamp-2">{shown}</span>
                                                <span className="text-[11px] text-ink-600 font-mono truncate">{row.key}</span>
                                            </div>
                                            {edited ? (
                                                <Badge tone="green">edited</Badge>
                                            ) : row.override ? (
                                                <Badge tone="gold">draft</Badge>
                                            ) : null}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                        {copyRows.length === 0 && (
                            <EmptyState title="Nothing matches" description="Try a different word." />
                        )}
                    </>
                ) : faqs && faqs.length === 0 ? (
                    <EmptyState
                        title="No questions yet"
                        description="Use “Import from code” above to bring in the four questions already live on the homepage, then edit them here. Or write a new one."
                        action={
                            can("content.publish") ? (
                                <div className="flex flex-wrap gap-2 justify-center">
                                    <Button variant="primary" onClick={importFromCode} disabled={importing}>
                                        {importing ? <Spinner className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                                        Import from code
                                    </Button>
                                    <Button onClick={() => setEditingFaq("new")}>
                                        <Plus className="w-3.5 h-3.5" /> New question
                                    </Button>
                                </div>
                            ) : can("content.write") ? (
                                <Button onClick={() => setEditingFaq("new")}><Plus className="w-3.5 h-3.5" /> New question</Button>
                            ) : undefined
                        }
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

            {isPageTab(tab) && (
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
                    // New pages start on whichever shelf you were looking at.
                    defaultKind={tab === "blog" ? "blog" : "legal"}
                    defaultCategory={category}
                    allPages={pages || []}
                    onClose={() => setEditingPage(null)}
                    onSaved={() => { setEditingPage(null); load(); }}
                />
            )}

            {editingCopy && (
                <CopyEditor
                    row={editingCopy}
                    onClose={() => setEditingCopy(null)}
                    onSaved={() => { setEditingCopy(null); load(); }}
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
