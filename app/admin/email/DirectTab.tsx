"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, Sparkles, ImagePlus, Send, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Panel, PanelHeader, Badge, Button, Input, Select, Textarea, EmptyState, Spinner, timeAgo } from "../components/ui";
import MarkdownToolbar, { useMarkdownShortcuts, useSelectionRestore } from "../components/MarkdownToolbar";
import { uploadContentMedia } from "@/lib/uploadContentMedia";

/**
 * Direct email: pick people, write to them, send.
 *
 * Sits beside Campaigns on purpose rather than inside it. A campaign answers
 * "who should hear this" with a query over tiers and languages; a direct email
 * answers it with names. Everything downstream follows from that: no audience
 * preview, no unsubscribe footer, no scheduler, a hard cap on recipients, and
 * a per-person delivery record instead of a progress bar.
 */

interface Recipient {
    uid: string;
    name: string;
    email: string;
}

interface SentEmail {
    id: string;
    subject: string;
    body: string;
    recipients: { uid: string; email: string; ok: boolean; error: string | null }[];
    sentCount: number;
    failedCount: number;
    sentByEmail: string;
    sentAt: number | null;
}

const MAX_RECIPIENTS = 50;

const LANGUAGES = [
    { value: "en", label: "English" },
    { value: "no", label: "Norwegian" },
    { value: "sv", label: "Swedish" },
];

export default function DirectTab() {
    const { adminFetch, can } = useAdmin();
    const canSend = can("announcements.send");

    // Recipients
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Recipient[]>([]);
    const [searching, setSearching] = useState(false);
    const [recipients, setRecipients] = useState<Recipient[]>([]);

    // Draft
    const [brief, setBrief] = useState("");
    const [language, setLanguage] = useState("en");
    const [drafting, setDrafting] = useState(false);

    // Email
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const bodyRef = useRef<HTMLTextAreaElement | null>(null);
    const onBodyKeyDown = useMarkdownShortcuts(bodyRef, body, setBody);
    const restoreSelection = useSelectionRestore(bodyRef, body);
    const fileInput = useRef<HTMLInputElement | null>(null);
    const [uploading, setUploading] = useState<number | null>(null);

    // Preview and send
    const [previewHtml, setPreviewHtml] = useState<string>("");
    const [sending, setSending] = useState(false);
    const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
    const [history, setHistory] = useState<SentEmail[] | null>(null);
    const [openHistory, setOpenHistory] = useState<string | null>(null);

    const loadHistory = useCallback(async () => {
        try {
            const res = await adminFetch("/api/admin/email/direct");
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load");
            setHistory((await res.json()).emails);
        } catch {
            setHistory([]);
        }
    }, [adminFetch]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // People search, debounced. The users API already handles name and email
    // lookups, including the case retry for addresses typed in capitals.
    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setResults([]);
            return;
        }
        let cancelled = false;
        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const res = await adminFetch(`/api/admin/users?q=${encodeURIComponent(q)}&limit=8`);
                const data = await res.json();
                if (cancelled) return;
                const chosen = new Set(recipients.map((r) => r.uid));
                setResults(
                    (data.users || [])
                        .filter((u: any) => u.email && !chosen.has(u.uid))
                        .map((u: any) => ({ uid: u.uid, name: u.name || "", email: u.email })),
                );
            } catch {
                if (!cancelled) setResults([]);
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query, recipients, adminFetch]);

    const addRecipient = (r: Recipient) => {
        if (recipients.length >= MAX_RECIPIENTS) {
            setNote({ tone: "error", text: `Direct email is for up to ${MAX_RECIPIENTS} people. For more than that, send a campaign.` });
            return;
        }
        setRecipients((list) => (list.some((x) => x.uid === r.uid) ? list : [...list, r]));
        setQuery("");
        setResults([]);
    };

    const removeRecipient = (uid: string) => setRecipients((list) => list.filter((r) => r.uid !== uid));

    // Live preview, rendered by the same function that sends. Debounced so
    // typing does not turn into a request per keystroke.
    useEffect(() => {
        if (!subject && !body) {
            setPreviewHtml("");
            return;
        }
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const res = await adminFetch("/api/admin/email/direct/preview", {
                    method: "POST",
                    body: JSON.stringify({ subject, body, sampleName: recipients[0]?.name || "Peter Nordberg" }),
                });
                const data = await res.json();
                if (!cancelled && res.ok) setPreviewHtml(data.html);
            } catch {
                /* the previous preview stays up */
            }
        }, 400);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [subject, body, recipients, adminFetch]);

    const draft = async () => {
        setDrafting(true);
        setNote(null);
        try {
            const res = await adminFetch("/api/admin/email/draft", {
                method: "POST",
                body: JSON.stringify({ prompt: brief, language, recipientNames: recipients.map((r) => r.name).filter(Boolean) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not draft");
            setSubject(data.subject);
            setBody(data.body);
        } catch (err: any) {
            setNote({ tone: "error", text: err.message });
        } finally {
            setDrafting(false);
        }
    };

    const insertAtCursor = (snippet: string) => {
        const field = bodyRef.current;
        const start = field ? field.selectionStart : body.length;
        const end = field ? field.selectionEnd : body.length;
        // Images live on their own line. Pad with newlines only where the
        // surrounding text does not already provide them.
        const before = body.slice(0, start);
        const after = body.slice(end);
        const lead = before && !before.endsWith("\n") ? "\n\n" : before.endsWith("\n\n") || !before ? "" : "\n";
        const tail = after && !after.startsWith("\n") ? "\n\n" : "";
        const next = before + lead + snippet + tail + after;
        setBody(next);
        const caret = (before + lead + snippet).length;
        restoreSelection(caret, caret);
    };

    const onPickImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setNote({ tone: "error", text: "Only images can be placed in an email." });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setNote({ tone: "error", text: "Keep email images under 5 MB. Inboxes load them slowly and some clip the message." });
            return;
        }
        setUploading(0);
        setNote(null);
        try {
            const url = await uploadContentMedia(file, "image", "email", (pct) => setUploading(pct)).done;
            insertAtCursor(`![${file.name.replace(/\.[^.]+$/, "")}](${url})`);
        } catch (err: any) {
            setNote({ tone: "error", text: err?.message || "Upload failed" });
        } finally {
            setUploading(null);
        }
    };

    const send = async () => {
        if (recipients.length === 0 || !subject.trim() || !body.trim()) return;
        const who = recipients.length === 1 ? recipients[0].email : `${recipients.length} people`;
        if (!window.confirm(`Send "${subject.trim()}" to ${who}? This goes out right away.`)) return;
        setSending(true);
        setNote(null);
        try {
            const res = await adminFetch("/api/admin/email/direct", {
                method: "POST",
                body: JSON.stringify({ recipients: recipients.map((r) => r.uid), subject, body }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not send");
            const failed = (data.results || []).filter((r: any) => !r.ok);
            if (failed.length === 0) {
                setNote({ tone: "ok", text: `Sent to ${data.sentCount} ${data.sentCount === 1 ? "person" : "people"}.` });
                setRecipients([]);
                setSubject("");
                setBody("");
                setBrief("");
            } else {
                setNote({
                    tone: "error",
                    text: `Sent to ${data.sentCount}, failed for ${failed.length}: ${failed.map((f: any) => f.email).join(", ")}. The failed ones are still in the recipient list.`,
                });
                const failedUids = new Set(failed.map((f: any) => f.uid));
                setRecipients((list) => list.filter((r) => failedUids.has(r.uid)));
            }
            await loadHistory();
        } catch (err: any) {
            setNote({ tone: "error", text: err.message });
        } finally {
            setSending(false);
        }
    };

    const ready = recipients.length > 0 && subject.trim().length > 0 && body.trim().length > 0;

    return (
        <div className="flex flex-col gap-6">
            {note && (
                <Panel className={`p-3.5 ${note.tone === "error" ? "border-red-500/30" : "border-green-500/30"}`}>
                    <p className={`text-xs ${note.tone === "error" ? "text-red-300" : "text-green-300"}`}>{note.text}</p>
                </Panel>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
                <div className="flex flex-col gap-6 min-w-0">
                    <Panel>
                        <PanelHeader
                            title="To"
                            subtitle={`Search by name or email. Up to ${MAX_RECIPIENTS} people; beyond that it is a campaign.`}
                        />
                        <div className="p-5 flex flex-col gap-3">
                            {recipients.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {recipients.map((r) => (
                                        <span
                                            key={r.uid}
                                            className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-ink-700 text-xs text-ink-100"
                                            title={r.email}
                                        >
                                            {r.name || r.email}
                                            <button
                                                type="button"
                                                onClick={() => removeRecipient(r.uid)}
                                                className="p-0.5 rounded-full text-ink-400 hover:text-ink-100 hover:bg-ink-600"
                                                aria-label={`Remove ${r.name || r.email}`}
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-ink-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <Input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Add a person"
                                    className="pl-8"
                                />
                                {(results.length > 0 || searching) && query.trim().length >= 2 && (
                                    <div className="absolute z-10 left-0 right-0 mt-1 rounded-xl border border-ink-600 bg-ink-800 shadow-xl overflow-hidden">
                                        {searching && results.length === 0 && (
                                            <div className="px-3 py-2.5 text-xs text-ink-400 flex items-center gap-2">
                                                <Spinner className="w-3 h-3" /> Searching
                                            </div>
                                        )}
                                        {results.map((r) => (
                                            <button
                                                key={r.uid}
                                                type="button"
                                                onClick={() => addRecipient(r)}
                                                className="w-full text-left px-3 py-2 hover:bg-ink-700 flex items-center justify-between gap-3"
                                            >
                                                <span className="text-sm text-ink-100 truncate">{r.name || "No name"}</span>
                                                <span className="text-xs text-ink-400 truncate">{r.email}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Panel>

                    <Panel>
                        <PanelHeader
                            title="Draft with AI"
                            subtitle="Say what the email is for. It fills the subject and body below, which you can then edit."
                        />
                        <div className="p-5 flex flex-col gap-3">
                            <Textarea
                                value={brief}
                                onChange={(e) => setBrief(e.target.value)}
                                rows={3}
                                placeholder="Thank them for the feedback on the melody practice and tell them the fix went live this morning"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                                <Select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-auto">
                                    {LANGUAGES.map((l) => (
                                        <option key={l.value} value={l.value}>{l.label}</option>
                                    ))}
                                </Select>
                                <Button onClick={draft} disabled={drafting || brief.trim().length < 8} size="sm">
                                    {drafting ? <Spinner className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    {subject || body ? "Draft again" : "Draft"}
                                </Button>
                                {(subject || body) && (
                                    <span className="text-xs text-ink-500">Drafting again replaces what is in the editor.</span>
                                )}
                            </div>
                        </div>
                    </Panel>

                    <Panel>
                        <PanelHeader title="Email" subtitle="Write {{name}} where the person's first name should go." />
                        <div className="p-5 flex flex-col gap-4">
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs text-ink-400">Subject</span>
                                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="About your melody practice" />
                            </label>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-ink-400">Body</span>
                                    <div className="flex items-center gap-1">
                                        <MarkdownToolbar textareaRef={bodyRef} value={body} onChange={setBody} />
                                        <span className="w-px h-4 bg-ink-600 mx-1" />
                                        <button
                                            type="button"
                                            title="Insert image"
                                            aria-label="Insert image"
                                            disabled={uploading !== null}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => fileInput.current?.click()}
                                            className="p-1.5 rounded-md text-ink-400 hover:text-ink-100 hover:bg-ink-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                        >
                                            {uploading !== null ? (
                                                <span className="text-[11px] tabular-nums">{Math.round(uploading)}%</span>
                                            ) : (
                                                <ImagePlus className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                                    </div>
                                </div>
                                <Textarea
                                    ref={bodyRef}
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    onKeyDown={onBodyKeyDown}
                                    rows={14}
                                    placeholder={"Hi {{name}},\n\n"}
                                    className="font-mono text-[13px] leading-relaxed"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-3 pt-1">
                                {canSend ? (
                                    <Button variant="primary" onClick={send} disabled={!ready || sending}>
                                        {sending ? <Spinner className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                                        {recipients.length > 1 ? `Send to ${recipients.length} people` : "Send"}
                                    </Button>
                                ) : (
                                    <span className="text-xs text-ink-400">Only a superadmin can send. You can write and preview the draft here.</span>
                                )}
                                {canSend && ready && <span className="text-xs text-ink-500">Sends immediately, one email per person.</span>}
                            </div>
                        </div>
                    </Panel>
                </div>

                <Panel className="xl:sticky xl:top-6 self-start">
                    <PanelHeader
                        title="Preview"
                        subtitle={recipients[0]?.name ? `As ${recipients[0].name.split(/\s+/)[0]} will see it` : "With a sample name"}
                    />
                    <div className="p-3">
                        {previewHtml ? (
                            <iframe
                                title="Email preview"
                                srcDoc={previewHtml}
                                sandbox=""
                                className="w-full h-[640px] rounded-lg bg-white border border-ink-600"
                            />
                        ) : (
                            <div className="h-[320px] flex items-center justify-center text-xs text-ink-500 text-center px-6">
                                The email appears here as you write it.
                            </div>
                        )}
                    </div>
                </Panel>
            </div>

            <Panel>
                <PanelHeader title="Sent" subtitle="Every direct email, with who received it." />
                {history === null ? (
                    <div className="p-8 flex justify-center"><Spinner className="w-5 h-5" /></div>
                ) : history.length === 0 ? (
                    <EmptyState title="Nothing sent yet" description="Direct emails you send will be listed here." />
                ) : (
                    <ul className="divide-y divide-ink-700">
                        {history.map((item) => {
                            const open = openHistory === item.id;
                            return (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        onClick={() => setOpenHistory(open ? null : item.id)}
                                        className="w-full text-left px-5 py-3.5 hover:bg-ink-800/60 flex items-center gap-4"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-ink-100 truncate">{item.subject}</p>
                                            <p className="text-xs text-ink-400 truncate">
                                                {item.sentByEmail} to {item.recipients.length} {item.recipients.length === 1 ? "person" : "people"}
                                            </p>
                                        </div>
                                        {item.failedCount > 0 && <Badge tone="red">{item.failedCount} failed</Badge>}
                                        <span className="text-xs text-ink-500 flex items-center gap-1 shrink-0">
                                            <Clock className="w-3 h-3" /> {item.sentAt ? timeAgo(item.sentAt) : ""}
                                        </span>
                                    </button>
                                    {open && (
                                        <div className="px-5 pb-4 flex flex-col gap-3">
                                            <ul className="flex flex-wrap gap-1.5">
                                                {item.recipients.map((r) => (
                                                    <li
                                                        key={r.uid}
                                                        title={r.error || undefined}
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                                                            r.ok ? "bg-ink-700 text-ink-200" : "bg-red-500/15 text-red-300"
                                                        }`}
                                                    >
                                                        {r.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                        {r.email}
                                                    </li>
                                                ))}
                                            </ul>
                                            <pre className="text-xs text-ink-300 whitespace-pre-wrap font-sans bg-ink-900/60 rounded-lg p-3 max-h-64 overflow-auto">{item.body}</pre>
                                            <div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setSubject(item.subject);
                                                        setBody(item.body);
                                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                                    }}
                                                >
                                                    Use as a starting point
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Panel>
        </div>
    );
}
