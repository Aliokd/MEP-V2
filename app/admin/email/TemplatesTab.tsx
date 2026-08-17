"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, RefreshCw, Save, RotateCcw, Globe, ChevronDown, KeyRound } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Panel, PanelHeader, Badge, Button, Input, Textarea, SkeletonRows, Spinner } from "../components/ui";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/content";

interface TemplateField {
    field: string;
    key: string;
    isList: boolean;
    /** Wording that ships in the code, per language. */
    shipped: Record<string, string>;
    /** Wording an editor has saved, per language. */
    edited: Record<string, string>;
}

interface TemplateRow {
    id: string;
    label: string;
    whenSent: string;
    variables: string[];
    carriesPassword?: boolean;
    fields: TemplateField[];
    preview: { subject: string; html: string };
    edited: boolean;
}

/** Long-form fields get a textarea; short labels get one line. */
const LONG_FIELDS = /body|note|task_\d_body|feedback|ignore|features|preheader/;

export default function TemplatesTab() {
    const { adminFetch, can } = useAdmin();

    const [templates, setTemplates] = useState<TemplateRow[] | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);
    const [locale, setLocale] = useState<Locale>("en");
    const [drafts, setDrafts] = useState<Record<string, Record<string, Record<string, string>>>>({});
    const [busyId, setBusyId] = useState<string | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        try {
            const res = await adminFetch(`/api/admin/email/templates?locale=${locale}`);
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load templates");
            setTemplates((await res.json()).templates);
        } catch (err: any) {
            setError(err.message);
            setTemplates([]);
        }
    }, [adminFetch, locale]);

    useEffect(() => {
        load();
    }, [load]);

    /** Current value for a field: the unsaved edit, then the saved one, then the shipped text. */
    const valueOf = (template: TemplateRow, field: TemplateField) =>
        drafts[template.id]?.[field.field]?.[locale] ??
        field.edited[locale] ??
        field.shipped[locale] ??
        "";

    const setValue = (templateId: string, field: string, text: string) =>
        setDrafts((prev) => ({
            ...prev,
            [templateId]: {
                ...(prev[templateId] || {}),
                [field]: { ...(prev[templateId]?.[field] || {}), [locale]: text },
            },
        }));

    const save = async (template: TemplateRow) => {
        setBusyId(template.id);
        setNote(null);
        try {
            // Send every field, not just the touched ones: the server treats a
            // field as "use the shipped wording" only when it is blank in every
            // language, and it can't tell that from a partial payload.
            const values: Record<string, Record<string, string>> = {};
            for (const field of template.fields) {
                const perLocale: Record<string, string> = {};
                for (const l of LOCALES) {
                    const v =
                        drafts[template.id]?.[field.field]?.[l] ?? field.edited[l] ?? "";
                    if (v.trim()) perLocale[l] = v;
                }
                values[field.field] = perLocale;
            }

            const res = await adminFetch("/api/admin/email/templates", {
                method: "PATCH",
                body: JSON.stringify({ id: template.id, values }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Save failed");

            setDrafts((prev) => ({ ...prev, [template.id]: {} }));
            setNote(`Saved. ${template.label} now uses your wording.`);
            await load();
        } catch (err: any) {
            setNote(err.message);
        } finally {
            setBusyId(null);
        }
    };

    const revert = async (template: TemplateRow) => {
        if (!window.confirm(`Put ${template.label} back to the wording that ships in the app?`)) return;
        setBusyId(template.id);
        try {
            const values: Record<string, Record<string, string>> = {};
            template.fields.forEach((f) => { values[f.field] = {}; });
            const res = await adminFetch("/api/admin/email/templates", {
                method: "PATCH",
                body: JSON.stringify({ id: template.id, values }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Revert failed");
            setDrafts((prev) => ({ ...prev, [template.id]: {} }));
            setNote(`${template.label} is back to the shipped wording.`);
            await load();
        } catch (err: any) {
            setNote(err.message);
        } finally {
            setBusyId(null);
        }
    };

    const sendTest = async (template: TemplateRow) => {
        setBusyId(template.id);
        setNote(null);
        try {
            const res = await adminFetch("/api/admin/email/templates", {
                method: "POST",
                body: JSON.stringify({ id: template.id, locale }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Test failed");
            setNote(`Test sent to ${data.sentTo}.`);
        } catch (err: any) {
            setNote(err.message);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
                <Globe className="w-3.5 h-3.5 text-ink-500" />
                {LOCALES.map((l) => (
                    <button
                        key={l}
                        onClick={() => setLocale(l)}
                        className={`px-3 py-1 rounded-full text-xs transition-colors ${
                            locale === l ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-100"
                        }`}
                    >
                        {LOCALE_LABELS[l]}
                    </button>
                ))}
                <Button onClick={load} size="sm" className="ml-auto">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </Button>
            </div>

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

            {!templates ? (
                <SkeletonRows rows={3} />
            ) : (
                templates.map((template) => {
                    const isOpen = openId === template.id;
                    return (
                        <Panel key={template.id} className="overflow-hidden">
                            <button
                                onClick={() => setOpenId(isOpen ? null : template.id)}
                                className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-ink-800 transition-colors"
                            >
                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm text-ink-100">{template.label}</span>
                                        {template.edited ? (
                                            <Badge tone="green">edited</Badge>
                                        ) : (
                                            <Badge tone="neutral">as shipped</Badge>
                                        )}
                                        {template.carriesPassword && (
                                            <Badge tone="gold"><KeyRound className="w-3 h-3" /> contains a password</Badge>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-ink-500">{template.whenSent}</span>
                                </div>
                                <ChevronDown
                                    className={`w-4 h-4 text-ink-500 shrink-0 mt-1 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                />
                            </button>

                            {isOpen && (
                                <div className="border-t border-ink-600 p-5 flex flex-col gap-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[11px] text-ink-500">
                                            Placeholders:{" "}
                                            {template.variables.map((v) => (
                                                <span key={v} className="font-mono text-ink-400">{`{{${v}}} `}</span>
                                            ))}
                                        </span>
                                    </div>

                                    <div className="grid lg:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-3 max-h-[32rem] overflow-y-auto pr-1">
                                            {template.fields.map((field) => {
                                                const long = LONG_FIELDS.test(field.field) || field.isList;
                                                const value = valueOf(template, field);
                                                const differs = value !== (field.shipped[locale] || "");
                                                return (
                                                    <label key={field.field} className="flex flex-col gap-1">
                                                        <span className="text-[11px] text-ink-400 flex items-center gap-2">
                                                            {field.field}
                                                            {differs && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                                                            {field.isList && (
                                                                <span className="text-ink-600">one per line</span>
                                                            )}
                                                        </span>
                                                        {long ? (
                                                            <Textarea
                                                                rows={field.isList ? 5 : 3}
                                                                value={value}
                                                                onChange={(e) => setValue(template.id, field.field, e.target.value)}
                                                            />
                                                        ) : (
                                                            <Input
                                                                value={value}
                                                                onChange={(e) => setValue(template.id, field.field, e.target.value)}
                                                            />
                                                        )}
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <span className="text-[11px] text-ink-500">
                                                Preview — {template.preview.subject}
                                            </span>
                                            <div className="rounded-xl overflow-hidden bg-white">
                                                {/* Built by the same code that sends the real email. */}
                                                <iframe
                                                    title={`${template.label} preview`}
                                                    srcDoc={template.preview.html}
                                                    className="w-full h-[30rem] border-0"
                                                />
                                            </div>
                                            <span className="text-[11px] text-ink-500">
                                                Reflects what is saved. Save to see your edits here.
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-ink-600">
                                        {can("announcements.write") && (
                                            <Button variant="primary" onClick={() => save(template)} disabled={busyId === template.id}>
                                                {busyId === template.id ? <Spinner className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                                                Save wording
                                            </Button>
                                        )}
                                        {can("announcements.send") && (
                                            <Button onClick={() => sendTest(template)} disabled={busyId === template.id}>
                                                <Mail className="w-3.5 h-3.5" /> Send test to myself
                                            </Button>
                                        )}
                                        {template.edited && can("announcements.write") && (
                                            <Button variant="danger" onClick={() => revert(template)} disabled={busyId === template.id} className="ml-auto">
                                                <RotateCcw className="w-3.5 h-3.5" /> Back to shipped wording
                                            </Button>
                                        )}
                                    </div>

                                    {template.carriesPassword && (
                                        <p className="text-[11px] text-gold-300">
                                            A test of this one uses a visible dummy password, never a real
                                            credential.
                                        </p>
                                    )}
                                </div>
                            )}
                        </Panel>
                    );
                })
            )}
        </div>
    );
}
