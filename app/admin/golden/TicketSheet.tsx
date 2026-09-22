"use client";

import { useCallback, useEffect, useState } from "react";
import {
    X, Copy, Check, ExternalLink, Send, KeyRound, Eye, EyeOff, Ban, RotateCcw, Trash2,
    Search, UserPlus, UserRound, RefreshCw,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Badge, Button, Input, Select, Spinner, Textarea } from "../components/ui";
import MediaUpload from "../components/MediaUpload";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/content";
import TicketArt from "@/app/golden/components/TicketArt";
import { padTicketNumber } from "@/app/golden/components/ticketShape";

/**
 * One ticket, opened from the wall.
 *
 * A sheet rather than a dialog because a ticket has two subjects, not one:
 * the place on the wall and the person holding it. Both, and everything that
 * can be done to either, belong on screen together, with the wall still
 * visible behind so it is clear which of the hundred is being worked on.
 *
 * It opens on two kinds of thing. A ticket that exists shows its holder, its
 * code and its page, and every action that can be taken on it. An empty
 * place shows the two ways to fill it: hand it to somebody who already has
 * an account, which grants them lifetime access at the same time, or mint it
 * in the name of somebody who has none yet so the ticket can be sent to them.
 */

export interface SheetTicket {
    slug: string;
    number: number;
    name: string;
    tagline: string | null;
    note: string | null;
    photoUrl: string | null;
    email: string | null;
    code?: string;
    status: "open" | "claimed" | "redeemed" | "revoked";
    claim: { email: string; message: string | null; locale: string; claimedAt: string } | null;
    redeemedBy: { uid: string; at: string; email: string | null } | null;
    invites: number;
    listed: boolean;
    origin: "console" | "grant";
    createdAt: string;
    updatedAt: string;
    pagePath: string;
}

export type SheetTarget =
    | { kind: "ticket"; ticket: SheetTicket }
    | { kind: "free"; number: number };

interface FoundUser {
    uid: string;
    name: string | null;
    email: string | null;
    tier: string | null;
    golden: { slug: string; number: number | null } | null;
}

const STATUS_TONE = {
    open: "neutral",
    claimed: "gold",
    redeemed: "green",
    revoked: "red",
} as const;

function message(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
}

/** Who a free ticket is being activated for. */
type Who = "existing" | "new";

/** What one activation left behind, shown once. */
interface Done {
    email: string;
    uid: string;
    /** Only when an account was made here; it cannot be read back. */
    password: string | null;
    emailSent: boolean;
    emailError: string | null;
    createdAccount: boolean;
}

const MIN_PASSWORD_LENGTH = 10;

/**
 * A readable, strong password, the same shape the New user dialog makes:
 * no O/0 or l/1/I, because a human reads this out to another human.
 */
function generatePassword(): string {
    const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnpqrstuvwxyz";
    const digits = "23456789";
    const symbols = "!@#$%*?";
    const all = upper + lower + digits + symbols;
    const pick = (set: string, count = 1) =>
        Array.from({ length: count }, () => set[Math.floor(Math.random() * set.length)]);
    const chars = [...pick(upper, 2), ...pick(lower, 6), ...pick(digits, 3), ...pick(symbols, 1), ...pick(all, 4)];
    for (let i = chars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
}

export default function TicketSheet({
    target,
    canWrite,
    onClose,
    onChanged,
}: {
    target: SheetTarget;
    canWrite: boolean;
    onClose: () => void;
    /** The page reloads the wall and shows this line. */
    onChanged: (note: string) => void;
}) {
    // Escape closes it, like every other sheet.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const number = target.kind === "ticket" ? target.ticket.number : target.number;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <aside
                className="w-full max-w-md h-full overflow-y-auto bg-ink-900 border-l border-ink-600 shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label={`Golden ticket ${number}`}
            >
                <header className="sticky top-0 z-10 bg-ink-900/95 backdrop-blur px-5 py-4 border-b border-ink-600 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-ink-100">Golden ticket {padTicketNumber(number)}</h2>
                        <p className="text-xs text-ink-400 mt-0.5">
                            {target.kind === "ticket" ? target.ticket.name : "Nobody holds this one yet"}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="text-ink-400 hover:text-ink-100 shrink-0" aria-label="Close">
                        <X className="w-4 h-4" />
                    </button>
                </header>

                {/* The ticket itself, so the sheet is unmistakably about the
                    card that was pressed. */}
                <div className="px-5 pt-5">
                    <div className="relative aspect-[5/3] rounded-[18px] overflow-hidden">
                        <TicketArt
                            number={number}
                            issued={target.kind === "ticket"}
                            id={`sheet-${number}`}
                            tone="ink"
                        />
                    </div>
                </div>

                {target.kind === "ticket" ? (
                    <IssuedTicketBody ticket={target.ticket} canWrite={canWrite} onChanged={onChanged} onClose={onClose} />
                ) : (
                    <FreeTicketBody number={target.number} canWrite={canWrite} onChanged={onChanged} />
                )}
            </aside>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* A ticket that exists                                                       */
/* -------------------------------------------------------------------------- */

function IssuedTicketBody({
    ticket,
    canWrite,
    onChanged,
    onClose,
}: {
    ticket: SheetTicket;
    canWrite: boolean;
    onChanged: (note: string) => void;
    onClose: () => void;
}) {
    const { adminFetch } = useAdmin();
    const [form, setForm] = useState({
        name: ticket.name,
        tagline: ticket.tagline ?? "",
        note: ticket.note ?? "",
        photoUrl: ticket.photoUrl ?? "",
        email: ticket.email ?? "",
    });
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const holderEmail = ticket.redeemedBy?.email || ticket.claim?.email || ticket.email;
    const holderUid = ticket.redeemedBy?.uid ?? null;

    const run = async (key: string, fn: () => Promise<Response>, note: string) => {
        setBusy(key);
        setError(null);
        try {
            const res = await fn();
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "That did not work");
            onChanged(note);
        } catch (err) {
            setError(message(err, "That did not work"));
        } finally {
            setBusy(null);
        }
    };

    const patch = (key: string, body: Record<string, unknown>, note: string) =>
        run(key, () => adminFetch(`/api/admin/golden/${ticket.slug}`, { method: "PATCH", body: JSON.stringify(body) }), note);

    const copy = async (value: string, key: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(key);
            window.setTimeout(() => setCopied(null), 1500);
        } catch {
            window.prompt("Copy:", value);
        }
    };

    const resend = () => {
        const to = window.prompt(
            ticket.status === "open"
                ? `Send this ticket straight to an address? That takes it on ${ticket.name}'s behalf.`
                : "Resend the ticket to:",
            holderEmail ?? "",
        );
        if (to === null) return;
        return run(
            "resend",
            () => adminFetch(`/api/admin/golden/${ticket.slug}/resend`, { method: "POST", body: JSON.stringify({ email: to.trim() || undefined }) }),
            `Ticket sent to ${to.trim() || holderEmail}.`,
        );
    };

    const remove = () => {
        const warning = holderUid
            ? `Delete ticket ${ticket.number} (${ticket.name})?\n\nSpot ${ticket.number} becomes free for someone else, and the ticket comes off ${holderEmail || "their"} account. Their lifetime access is NOT changed; do that in Users.`
            : `Delete ticket ${ticket.number} (${ticket.name})?\n\nSpot ${ticket.number} becomes free for someone else. This cannot be undone.`;
        if (!window.confirm(warning)) return;
        return run(
            "delete",
            () => adminFetch(`/api/admin/golden/${ticket.slug}`, { method: "DELETE" }),
            `Ticket ${ticket.number} deleted. Spot ${ticket.number} is free.`,
        ).then(onClose);
    };

    return (
        <div className="p-5 flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
                <Badge tone={STATUS_TONE[ticket.status]}>{ticket.status}</Badge>
                {ticket.origin === "grant" && <Badge tone="blue">granted</Badge>}
                <Badge tone={ticket.listed ? "green" : "neutral"}>{ticket.listed ? "on the wall" : "off the wall"}</Badge>
                <span className="text-[11px] text-ink-500 ml-auto">{ticket.invites} invites</span>
            </div>

            {error && <p className="text-xs text-red-300">{error}</p>}

            {/* Who holds it */}
            <Section title="Holder">
                {holderEmail ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <UserRound className="w-3.5 h-3.5 text-ink-500 shrink-0" />
                            <span className="text-sm text-ink-100 truncate">{holderEmail}</span>
                            <button type="button" onClick={() => copy(holderEmail, "holder")} className="text-ink-500 hover:text-ink-200 shrink-0">
                                {copied === "holder" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        {ticket.redeemedBy?.at && (
                            <p className="text-[11px] text-ink-500">Held since {new Date(ticket.redeemedBy.at).toLocaleDateString()}</p>
                        )}
                        {ticket.claim?.message && <p className="text-xs text-ink-300 italic">“{ticket.claim.message}”</p>}
                        {holderUid && (
                            <a
                                href={`/admin/users?uid=${holderUid}`}
                                className="inline-flex items-center gap-1.5 text-xs text-gold-300 hover:text-gold-200 w-fit"
                            >
                                Manage this account in Users <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                ) : (
                    <p className="text-xs text-ink-400">
                        Nobody has taken this one. Send it, or let them take it on {ticket.pagePath}.
                    </p>
                )}
            </Section>

            {/* The ticket's own facts */}
            <Section title="Ticket">
                <div className="flex flex-col gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                        <a href={ticket.pagePath} target="_blank" rel="noreferrer" className="text-ink-200 hover:underline truncate">
                            {ticket.pagePath}
                        </a>
                        <ExternalLink className="w-3 h-3 text-ink-500 shrink-0" />
                    </div>
                    {ticket.code && (
                        <div className="flex items-center gap-2">
                            <code className="text-ink-200 tracking-wider">{ticket.code}</code>
                            <button type="button" onClick={() => copy(ticket.code!, "code")} className="text-ink-500 hover:text-ink-200">
                                {copied === "code" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    )}
                    <p className="text-ink-500">
                        {ticket.origin === "grant" ? "Issued with a lifetime grant" : "Chosen in this console"}
                        {ticket.createdAt ? ` on ${new Date(ticket.createdAt).toLocaleDateString()}` : ""}
                    </p>
                </div>
            </Section>

            {canWrite && (
                <>
                    {/* What the page says */}
                    <Section title="What the page says">
                        <form
                            className="flex flex-col gap-3"
                            onSubmit={(e) => {
                                e.preventDefault();
                                patch("save", form, `${form.name} saved.`);
                            }}
                        >
                            <Field label="Name">
                                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                            </Field>
                            <Field label="Tagline">
                                <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Songwriter, Oslo" />
                            </Field>
                            <Field label="A personal line, shown on their page">
                                <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={3} />
                            </Field>
                            <div className="flex flex-col gap-1.5">
                                <MediaUpload
                                    label="Photo"
                                    kind="image"
                                    value={form.photoUrl}
                                    onChange={(url) => setForm({ ...form, photoUrl: url })}
                                    nameHint={form.name || ticket.slug}
                                    hint="Square works best. Or paste a URL below."
                                />
                                <Input value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} placeholder="https://… or /assets/…" />
                            </div>
                            <Field label="Email on file (never shown)">
                                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                            </Field>
                            <Button type="submit" variant="primary" size="sm" className="w-fit" disabled={busy === "save" || !form.name.trim()}>
                                {busy === "save" ? <Spinner className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />} Save
                            </Button>
                        </form>
                    </Section>

                    {/* Everything else that can be done to it */}
                    <Section title="Actions">
                        <div className="flex flex-wrap gap-2">
                            {ticket.status !== "revoked" && (
                                <Button
                                    size="sm"
                                    disabled={busy !== null}
                                    onClick={() => patch("listed", { listed: !ticket.listed }, ticket.listed ? `Ticket ${ticket.number} is off the wall.` : `Ticket ${ticket.number} is on the wall.`)}
                                >
                                    {ticket.listed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    {ticket.listed ? "Take off the wall" : "Put on the wall"}
                                </Button>
                            )}
                            {ticket.status !== "revoked" && ticket.status !== "redeemed" && (
                                <Button size="sm" disabled={busy !== null} onClick={resend}>
                                    {busy === "resend" ? <Spinner className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                                    {ticket.status === "open" ? "Send it" : "Resend"}
                                </Button>
                            )}
                            {ticket.status === "claimed" && (
                                <Button
                                    size="sm"
                                    disabled={busy !== null}
                                    onClick={() => {
                                        if (window.confirm(`Reset ticket ${ticket.number}? The claim by ${ticket.claim?.email} is forgotten.`)) {
                                            patch("reset", { status: "open" }, `Ticket ${ticket.number} is open again.`);
                                        }
                                    }}
                                >
                                    <RotateCcw className="w-3.5 h-3.5" /> Reset the claim
                                </Button>
                            )}
                            {ticket.status !== "revoked" && (
                                <Button
                                    size="sm"
                                    disabled={busy !== null}
                                    onClick={() => {
                                        if (window.confirm(`New code for ticket ${ticket.number}? The old one stops working at once.`)) {
                                            patch("code", { newCode: true }, `Ticket ${ticket.number} has a new code.`);
                                        }
                                    }}
                                >
                                    <KeyRound className="w-3.5 h-3.5" /> New code
                                </Button>
                            )}
                            {ticket.status !== "revoked" ? (
                                <Button
                                    size="sm"
                                    variant="danger"
                                    disabled={busy !== null}
                                    onClick={() => {
                                        if (window.confirm(`Revoke ticket ${ticket.number}? It leaves the wall and spot ${ticket.number} frees up.`)) {
                                            patch("revoke", { status: "revoked" }, `Ticket ${ticket.number} revoked. Spot ${ticket.number} is free.`);
                                        }
                                    }}
                                >
                                    <Ban className="w-3.5 h-3.5" /> Revoke
                                </Button>
                            ) : (
                                <Button size="sm" disabled={busy !== null} onClick={() => patch("reopen", { status: "open" }, `Ticket ${ticket.number} is open again.`)}>
                                    <RotateCcw className="w-3.5 h-3.5" /> Reopen
                                </Button>
                            )}
                            <Button size="sm" variant="danger" disabled={busy !== null} onClick={remove}>
                                {busy === "delete" ? <Spinner className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
                            </Button>
                        </div>
                        <p className="text-[11px] text-ink-500 mt-3">
                            Revoking and deleting both give spot {ticket.number} back to the wall. Neither changes the holder&apos;s
                            lifetime access, which lives on their account in Users.
                        </p>
                    </Section>
                </>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* An empty place                                                             */
/* -------------------------------------------------------------------------- */

function FreeTicketBody({
    number,
    canWrite,
    onChanged,
}: {
    number: number;
    canWrite: boolean;
    onChanged: (note: string) => void;
}) {
    const { adminFetch } = useAdmin();

    const [who, setWho] = useState<Who>("existing");
    const [picked, setPicked] = useState<FoundUser | null>(null);

    // A new account, on the same terms the New user dialog offers.
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState(() => generatePassword());
    const [showPassword, setShowPassword] = useState(true);
    const [locale, setLocale] = useState<Locale>("en");
    const [emailVerified, setEmailVerified] = useState(true);

    // What the wall will say.
    const [ticketName, setTicketName] = useState("");
    const [tagline, setTagline] = useState("");

    // The email, which is the admin's to write.
    const [sendEmail, setSendEmail] = useState(true);
    const [subject, setSubject] = useState("");
    const [personalNote, setPersonalNote] = useState("");

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<Done | null>(null);
    const [copied, setCopied] = useState(false);

    const chosenName = (ticketName.trim() || picked?.name || name.trim() || (email.trim().split("@")[0] ?? "")).trim();

    if (!canWrite) {
        return (
            <div className="p-5">
                <p className="text-xs text-ink-400">Spot {number} is free. Your role cannot hand it out.</p>
            </div>
        );
    }

    if (done) {
        return (
            <ActivatedSummary
                done={done}
                number={number}
                copied={copied}
                onCopy={async () => {
                    if (!done.password) return;
                    await navigator.clipboard.writeText(
                        `Veinote sign-in\nEmail: ${done.email}\nPassword: ${done.password}\nhttps://veinote.com/signin`,
                    );
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                }}
            />
        );
    }

    /**
     * One press, three steps, in the order that fails safest: the account
     * first (so nothing is half-made), then the ticket and the tier, then
     * the email. A failed email never undoes the grant; it is reported and
     * the ticket can be sent again from the sheet.
     */
    const activate = async () => {
        setBusy(true);
        setError(null);
        try {
            let uid = picked?.uid ?? null;
            let address = picked?.email ?? null;
            let madePassword: string | null = null;
            let slug: string | null = null;

            if (who === "new") {
                const res = await adminFetch("/api/admin/users/create", {
                    method: "POST",
                    body: JSON.stringify({
                        email: email.trim(),
                        password,
                        name: chosenName,
                        tier: "comp",
                        locale,
                        // The golden email is the welcome here; a second one
                        // arriving at the same moment would be noise.
                        sendWelcome: false,
                        emailVerified,
                        goldenNumber: number,
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Could not create the account");
                uid = data.uid;
                address = data.email;
                madePassword = password;
                if (data.golden?.outcome && data.golden.outcome !== "issued") {
                    throw new Error(`The account was created but ticket ${number} could not be issued (${data.golden.outcome}).`);
                }
                slug = data.golden?.slug ?? null;
            } else {
                if (!picked) throw new Error("Pick the account this ticket belongs to");
                const res = await adminFetch("/api/admin/golden/assign", {
                    method: "POST",
                    body: JSON.stringify({ uid: picked.uid, number, listed: true }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Could not activate the ticket");
                slug = data.ticket?.slug ?? null;
            }

            // The name and tagline the wall shows, when they differ from the
            // account's own.
            if (slug && (ticketName.trim() || tagline.trim())) {
                await adminFetch(`/api/admin/golden/${slug}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                        ...(ticketName.trim() ? { name: ticketName.trim() } : {}),
                        ...(tagline.trim() ? { tagline: tagline.trim() } : {}),
                    }),
                }).catch(() => { /* the ticket exists; the wording can be fixed in the sheet */ });
            }

            let emailSent = false;
            let emailError: string | null = null;
            if (sendEmail && slug && address) {
                const res = await adminFetch(`/api/admin/golden/${slug}/resend`, {
                    method: "POST",
                    body: JSON.stringify({ email: address, locale, subject: subject.trim() || undefined, note: personalNote.trim() || undefined }),
                });
                const data = await res.json().catch(() => ({}));
                emailSent = res.ok;
                if (!res.ok) emailError = data.error || "The email did not go out";
            }

            setDone({ email: address ?? "", uid: uid ?? "", password: madePassword, emailSent, emailError, createdAccount: who === "new" });
            onChanged(
                `Ticket ${padTicketNumber(number)} activated for ${address}.` +
                    (who === "new" ? " Account created on Lifetime Pro." : " They are on Lifetime Pro now.") +
                    (sendEmail ? (emailSent ? " The ticket email has gone out." : " The email did not send.") : ""),
            );
        } catch (err) {
            setError(message(err, "Could not activate the ticket"));
        } finally {
            setBusy(false);
        }
    };

    const ready =
        who === "existing"
            ? Boolean(picked) && !picked?.golden
            : email.trim().length > 3 && password.length >= MIN_PASSWORD_LENGTH;

    return (
        <div className="p-5 flex flex-col gap-5">
            <p className="text-xs text-ink-400">
                Spot {number} of the hundred is free. Activating it gives one person the ticket and Lifetime Pro together,
                and sends them whatever you write below.
            </p>

            {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
                    <p className="text-xs text-red-300">{error}</p>
                </div>
            )}

            {/* 1. Who */}
            <Section title="1 · Who gets it">
                <div className="flex items-center gap-1 rounded-full border border-ink-600 p-0.5 w-fit mb-3">
                    {(["existing", "new"] as const).map((w) => (
                        <button
                            key={w}
                            type="button"
                            onClick={() => { setWho(w); setError(null); }}
                            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${who === w ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-200"}`}
                        >
                            {w === "existing" ? "An account we have" : "A new account"}
                        </button>
                    ))}
                </div>

                {who === "existing" ? (
                    <UserPicker picked={picked} onPick={setPicked} />
                ) : (
                    <div className="flex flex-col gap-3">
                        <Field label="Email">
                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="their@email.com" autoComplete="off" />
                        </Field>
                        <Field label="Name (optional)">
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Taken from the email if left blank" autoComplete="off" />
                        </Field>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs text-ink-400">Password</span>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pr-9 font-mono"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-200"
                                        title={showPassword ? "Hide" : "Show"}
                                    >
                                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <Button onClick={() => setPassword(generatePassword())} title="Generate a new one">
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                            <span className={`text-[11px] ${password.length >= MIN_PASSWORD_LENGTH ? "text-ink-500" : "text-gold-300"}`}>
                                At least {MIN_PASSWORD_LENGTH} characters. You see it once, after activating. The ticket
                                email never carries it.
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Language">
                                <Select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
                                    {LOCALES.map((l) => (
                                        <option key={l} value={l}>{LOCALE_LABELS[l]}</option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Address">
                                <Select value={emailVerified ? "verified" : "unverified"} onChange={(e) => setEmailVerified(e.target.value === "verified")}>
                                    <option value="verified">Already verified</option>
                                    <option value="unverified">Make them verify it</option>
                                </Select>
                            </Field>
                        </div>
                    </div>
                )}
            </Section>

            {/* 2. The wall */}
            <Section title="2 · What the wall says">
                <div className="flex flex-col gap-3">
                    <Field label="Name on the ticket">
                        <Input
                            value={ticketName}
                            onChange={(e) => setTicketName(e.target.value)}
                            placeholder={picked?.name || name.trim() || "Taken from the account"}
                        />
                    </Field>
                    <Field label="Tagline">
                        <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Songwriter, Oslo" />
                    </Field>
                    <p className="text-[11px] text-ink-500">
                        The photo and the personal line on their page are set afterwards, in this sheet.
                    </p>
                </div>
            </Section>

            {/* 3. The email */}
            <Section title="3 · The email">
                <div className="flex flex-col gap-3">
                    <Field label="What goes out">
                        <Select value={sendEmail ? "golden" : "none"} onChange={(e) => setSendEmail(e.target.value === "golden")}>
                            <option value="golden">The golden ticket email</option>
                            <option value="none">Nothing, I will write to them myself</option>
                        </Select>
                    </Field>

                    {sendEmail ? (
                        <>
                            <Field label="Subject (blank keeps the template's)">
                                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Your golden ticket to Veinote" />
                            </Field>
                            <Field label="A line from you, printed near the top">
                                <Textarea
                                    value={personalNote}
                                    onChange={(e) => setPersonalNote(e.target.value.slice(0, 2000))}
                                    rows={4}
                                    placeholder="Why this person. Written to them, in your words."
                                />
                            </Field>
                            <div className="rounded-lg bg-ink-800 border border-ink-600 p-3 text-[11px] text-ink-400 leading-relaxed">
                                <p className="text-ink-300 font-medium mb-1">What they will get</p>
                                <p>
                                    The badge and greeting, your line above, then{" "}
                                    {who === "new"
                                        ? "the code and a button that opens Veinote with it already in place"
                                        : "the code for the record and a button that opens Veinote, since the ticket is already on their account"}
                                    , the five benefits, and a link to their page on the wall.
                                    {who === "new" && " The password is never in it; copy it from the next screen."}
                                </p>
                            </div>
                        </>
                    ) : (
                        <p className="text-[11px] text-ink-500">
                            Nothing is sent. The ticket is still theirs, and you can send it later from this sheet.
                        </p>
                    )}
                </div>
            </Section>

            <Button variant="primary" disabled={!ready || busy} onClick={activate} className="w-fit">
                {busy ? <Spinner className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                Activate ticket {padTicketNumber(number)}
            </Button>
        </div>
    );
}

/** What happened, once. The password can never be read back. */
function ActivatedSummary({
    done,
    number,
    copied,
    onCopy,
}: {
    done: Done;
    number: number;
    copied: boolean;
    onCopy: () => void;
}) {
    return (
        <div className="p-5 flex flex-col gap-4">
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 flex flex-col gap-2">
                <p className="text-sm text-ink-100">
                    Ticket {padTicketNumber(number)} is {done.email}&apos;s, and they are on Lifetime Pro.
                </p>
                {done.password && (
                    <>
                        <div className="flex flex-col gap-1 pt-1">
                            <span className="text-[11px] text-ink-500">Password</span>
                            <span className="text-sm text-ink-100 font-mono break-all">{done.password}</span>
                        </div>
                        <Button onClick={onCopy} size="sm" className="self-start">
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? "Copied" : "Copy sign-in details"}
                        </Button>
                    </>
                )}
            </div>

            <p className="text-xs text-ink-400 leading-relaxed">
                {done.emailError
                    ? `The ticket email did not go out: ${done.emailError} Send it again from the ticket once that is fixed.`
                    : done.emailSent
                      ? "The ticket email has gone out with your wording in it."
                      : "No email was sent. Write to them yourself, or send the ticket from this sheet."}
                {done.password && " The password is not stored anywhere readable, so pass it on now."}
            </p>

            <a href={`/admin/users?uid=${done.uid}`} className="text-xs text-gold-300 hover:text-gold-200 w-fit">
                Open their account in Users
            </a>
        </div>
    );
}

/** Search the console's own user directory and pick one. */
function UserPicker({ picked, onPick }: { picked: FoundUser | null; onPick: (u: FoundUser | null) => void }) {
    const { adminFetch } = useAdmin();
    const [query, setQuery] = useState("");
    const [debounced, setDebounced] = useState("");
    const [results, setResults] = useState<FoundUser[] | null>(null);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        const id = window.setTimeout(() => setDebounced(query.trim()), 300);
        return () => window.clearTimeout(id);
    }, [query]);

    const search = useCallback(async () => {
        if (debounced.length < 2) {
            setResults(null);
            return;
        }
        setSearching(true);
        try {
            const res = await adminFetch(`/api/admin/users?q=${encodeURIComponent(debounced)}&limit=8`);
            const data = await res.json();
            setResults(res.ok ? (data.users ?? []) : []);
        } catch {
            setResults([]);
        } finally {
            setSearching(false);
        }
    }, [adminFetch, debounced]);

    useEffect(() => {
        search();
    }, [search]);

    if (picked) {
        return (
            <div className="flex items-center gap-3 rounded-lg bg-ink-800 border border-ink-600 p-3">
                <UserRound className="w-4 h-4 text-ink-500 shrink-0" />
                <div className="min-w-0">
                    <p className="text-sm text-ink-100 truncate">{picked.name || picked.email}</p>
                    <p className="text-[11px] text-ink-400 truncate">{picked.email}</p>
                </div>
                <Button size="sm" variant="ghost" className="ml-auto shrink-0" onClick={() => onPick(null)}>
                    Change
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className="relative">
                <Search className="w-4 h-4 text-ink-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by email, name or uid"
                    className="pl-9"
                    autoFocus
                />
            </div>

            {searching && (
                <p className="text-xs text-ink-400 flex items-center gap-2 mt-3">
                    <Spinner className="w-3.5 h-3.5" /> Searching
                </p>
            )}
            {results && results.length === 0 && !searching && (
                <p className="text-xs text-ink-400 mt-3">Nobody matches that. Make a new account instead.</p>
            )}
            {!results && !searching && <p className="text-[11px] text-ink-500 mt-3">Type at least two characters.</p>}

            <ul className="flex flex-col divide-y divide-ink-700 mt-1">
                {(results ?? []).map((user) => {
                    const taken = Boolean(user.golden);
                    return (
                        <li key={user.uid} className="py-2.5 flex items-center gap-3">
                            <div className="min-w-0">
                                <p className="text-sm text-ink-100 truncate">{user.name || user.email || user.uid}</p>
                                <p className="text-[11px] text-ink-400 truncate">
                                    {user.email}
                                    {taken && ` · holds ticket ${user.golden?.number ?? user.golden?.slug}`}
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant={taken ? "secondary" : "primary"}
                                className="ml-auto shrink-0"
                                disabled={taken}
                                title={taken ? "Delete their current ticket first" : "Choose this account"}
                                onClick={() => onPick(user)}
                            >
                                {taken ? "Has one" : "Choose"}
                            </Button>
                        </li>
                    );
                })}
            </ul>
        </>
    );
}

/* -------------------------------------------------------------------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-xl bg-ink-850 border border-ink-600 p-4">
            <h3 className="text-[11px] font-medium text-ink-500 mb-3">{title}</h3>
            {children}
        </section>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs text-ink-400">{label}</span>
            {children}
        </label>
    );
}
