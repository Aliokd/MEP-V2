"use client";

import { useRef, useState } from "react";
import { X, Upload, Download, Check, TriangleAlert } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Badge, Button, Panel, Spinner } from "../components/ui";
import { ideasCsvTemplate, parseIdeasFile, type ParsedRow } from "@/lib/bulkIdeas";
import { LOCALES, LOCALE_LABELS, pickLocale } from "@/lib/content";

/**
 * Bulk upload for Bank of Ideas cards.
 *
 * Parses in the browser and shows every row before anything is written — with a
 * bad row's line number and reason — because the alternative is uploading 200
 * cards and discovering afterwards which three were wrong.
 */
export default function BulkIdeasDialog({
    onClose,
    onImported,
}: {
    onClose: () => void;
    onImported: () => void;
}) {
    const { adminFetch, can } = useAdmin();
    const inputRef = useRef<HTMLInputElement>(null);

    const [fileName, setFileName] = useState("");
    const [rows, setRows] = useState<ParsedRow[] | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<{ created: number; updated: number; rejected: { id: string; reason: string }[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);

    const valid = rows?.filter((r) => r.idea) || [];
    const invalid = rows?.filter((r) => !r.idea) || [];

    const handleFile = async (file: File) => {
        setError(null);
        setResult(null);
        setFileName(file.name);
        try {
            setRows(parseIdeasFile(file.name, await file.text()));
        } catch (err: any) {
            setError(err.message || "Couldn't read that file");
            setRows(null);
        }
    };

    const downloadTemplate = () => {
        const blob = new Blob([ideasCsvTemplate()], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "veinote-ideas-template.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const upload = async (status: "draft" | "published") => {
        if (valid.length === 0) return;
        setUploading(true);
        setError(null);
        try {
            const res = await adminFetch("/api/admin/content/ideas/bulk", {
                method: "POST",
                body: JSON.stringify({ ideas: valid.map((r) => r.idea), status }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Upload failed");

            setResult({ created: data.created, updated: data.updated, rejected: data.rejected || [] });
            setRows(null);
            onImported();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />

            <aside className="relative w-full max-w-3xl bg-ink-900 border-l border-ink-600 h-full overflow-y-auto">
                <header className="sticky top-0 z-10 bg-ink-900 border-b border-ink-600 px-5 py-4 flex items-start gap-3">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <h2 className="text-base text-ink-100 font-medium">Bulk upload cards</h2>
                        <p className="text-xs text-ink-500">
                            CSV or JSON. Cards are matched by id: an existing id is updated, a new one is created.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-ink-500 hover:text-ink-100 shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </header>

                <div className="p-5 flex flex-col gap-4">
                    {error && (
                        <Panel className="p-3.5 border-red-500/30">
                            <p className="text-sm text-red-300">{error}</p>
                        </Panel>
                    )}

                    {result ? (
                        <>
                            <Panel className="p-4 border-green-500/30 bg-green-500/5 flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-400" />
                                    <span className="text-sm text-green-200">
                                        {result.created} created, {result.updated} updated
                                    </span>
                                </div>
                                {result.rejected.length > 0 && (
                                    <div className="flex flex-col gap-1 mt-1">
                                        <span className="text-xs text-gold-300">
                                            {result.rejected.length} rejected by the server:
                                        </span>
                                        {result.rejected.slice(0, 10).map((r, i) => (
                                            <span key={i} className="text-[11px] text-ink-400">
                                                {r.id}: {r.reason}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </Panel>
                            <div className="flex gap-2">
                                <Button variant="primary" onClick={() => { setResult(null); setFileName(""); }}>
                                    Upload another file
                                </Button>
                                <Button onClick={onClose}>Done</Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button size="sm" onClick={downloadTemplate}>
                                    <Download className="w-3.5 h-3.5" /> Download CSV template
                                </Button>
                                <span className="text-[11px] text-ink-500">
                                    Columns are field_locale: title_en, title_no, description_sv, and so on.
                                </span>
                            </div>

                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragging(false);
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) handleFile(file);
                                }}
                                className={`flex flex-col items-center gap-2 p-8 rounded-xl border border-dashed transition-colors ${
                                    dragging ? "border-green-500/60 bg-green-500/5" : "border-ink-600"
                                }`}
                            >
                                <Button onClick={() => inputRef.current?.click()}>
                                    <Upload className="w-3.5 h-3.5" /> Choose a file
                                </Button>
                                <span className="text-[11px] text-ink-500">
                                    {fileName || "or drop a .csv or .json here"}
                                </span>
                                <input
                                    ref={inputRef}
                                    type="file"
                                    accept=".csv,.json,text/csv,application/json"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFile(file);
                                    }}
                                />
                            </div>

                            {rows && (
                                <>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge tone="green">{valid.length} ready</Badge>
                                        {invalid.length > 0 && <Badge tone="red">{invalid.length} with problems</Badge>}
                                        <span className="text-[11px] text-ink-500 ml-auto">
                                            Nothing is written until you choose below.
                                        </span>
                                    </div>

                                    {invalid.length > 0 && (
                                        <Panel className="p-4 border-red-500/30 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                                            <span className="text-xs text-red-300 flex items-center gap-1.5">
                                                <TriangleAlert className="w-3 h-3" /> These rows will be skipped
                                            </span>
                                            {invalid.map((row) => (
                                                <span key={row.line} className="text-[11px] text-ink-400">
                                                    Line {row.line}: {row.errors.join("; ")}
                                                </span>
                                            ))}
                                        </Panel>
                                    )}

                                    {valid.length > 0 && (
                                        <Panel className="overflow-hidden">
                                            <div className="px-4 py-2.5 border-b border-ink-600 text-xs text-ink-400">
                                                Preview
                                            </div>
                                            <ul className="divide-y divide-ink-600 max-h-72 overflow-y-auto">
                                                {valid.map((row) => (
                                                    <li key={row.line} className="px-4 py-2.5 flex items-center gap-3">
                                                        <span className="text-[11px] text-ink-600 font-mono w-28 truncate shrink-0">
                                                            {row.idea!.id}
                                                        </span>
                                                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                                            <span className="text-sm text-ink-100 truncate">
                                                                {pickLocale(row.idea!.title, "en")}
                                                            </span>
                                                            <span className="text-[11px] text-ink-500 truncate">
                                                                {pickLocale(row.idea!.description, "en")}
                                                            </span>
                                                        </div>
                                                        <Badge tone="neutral">{row.idea!.category}</Badge>
                                                        <div className="hidden sm:flex items-center gap-1 shrink-0">
                                                            {LOCALES.map((l) => (
                                                                <span
                                                                    key={l}
                                                                    title={LOCALE_LABELS[l]}
                                                                    className={`w-1.5 h-4 rounded-full ${
                                                                        row.idea!.title[l]?.trim() ? "bg-green-500" : "bg-ink-600"
                                                                    }`}
                                                                />
                                                            ))}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </Panel>
                                    )}

                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-ink-600">
                                        <Button onClick={() => upload("draft")} disabled={uploading || valid.length === 0}>
                                            {uploading ? <Spinner className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
                                            Import {valid.length} as drafts
                                        </Button>
                                        {can("content.publish") && (
                                            <Button
                                                variant="primary"
                                                onClick={() => upload("published")}
                                                disabled={uploading || valid.length === 0}
                                            >
                                                Import and publish
                                            </Button>
                                        )}
                                        <Button variant="ghost" onClick={() => { setRows(null); setFileName(""); }} disabled={uploading}>
                                            Clear
                                        </Button>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </aside>
        </div>
    );
}
