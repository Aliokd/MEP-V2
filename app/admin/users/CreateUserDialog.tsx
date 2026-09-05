"use client";

import { useState } from "react";
import { X, UserPlus, RefreshCw, Eye, EyeOff, Copy, Check } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Badge, Button, Input, Panel, Select, Spinner } from "../components/ui";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/content";

const MIN_PASSWORD_LENGTH = 10;

/**
 * Generates a readable, strong password.
 *
 * Excludes the characters people misread out loud or in a chat message — O/0,
 * l/1/I — because these get handed over by a human to another human.
 */
function generatePassword(): string {
    const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnpqrstuvwxyz";
    const digits = "23456789";
    const symbols = "!@#$%*?";
    const all = upper + lower + digits + symbols;

    const pick = (set: string, count = 1) =>
        Array.from({ length: count }, () => set[Math.floor(Math.random() * set.length)]);

    // Guarantee one of each class, then fill and shuffle.
    const chars = [
        ...pick(upper, 2),
        ...pick(lower, 6),
        ...pick(digits, 3),
        ...pick(symbols, 1),
        ...pick(all, 4),
    ];
    for (let i = chars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
}

/** What goes out when the account is made. "none" sends nothing at all. */
type EmailChoice = "welcome" | "beta" | "none";

interface Created {
    uid: string;
    email: string;
    password: string;
    welcomeSent: boolean;
    emailChoice: EmailChoice;
}

export default function CreateUserDialog({
    onClose,
    onCreated,
}: {
    onClose: () => void;
    onCreated: () => void;
}) {
    const { adminFetch } = useAdmin();

    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState(() => generatePassword());
    const [showPassword, setShowPassword] = useState(true);
    const [tier, setTier] = useState("trial");
    const [locale, setLocale] = useState<Locale>("en");
    const [trialDays, setTrialDays] = useState("14");
    const [emailChoice, setEmailChoice] = useState<EmailChoice>("welcome");
    const [emailVerified, setEmailVerified] = useState(true);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<Created | null>(null);
    const [copied, setCopied] = useState(false);

    const copyCredentials = async () => {
        if (!created) return;
        await navigator.clipboard.writeText(
            `Veinote sign-in\nEmail: ${created.email}\nPassword: ${created.password}\nhttps://veinote.com/signin`,
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const submit = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await adminFetch("/api/admin/users/create", {
                method: "POST",
                body: JSON.stringify({
                    email,
                    password,
                    name,
                    tier,
                    locale,
                    trialDays: Number(trialDays) || 0,
                    sendWelcome: emailChoice !== "none",
                    emailType: emailChoice === "none" ? "welcome" : emailChoice,
                    emailVerified,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not create the account");

            // Shown once. The password is not stored anywhere we can read back.
            setCreated({
                uid: data.uid,
                email: data.email,
                password,
                welcomeSent: data.welcomeSent,
                emailChoice,
            });
            onCreated();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const canSubmit = email.trim().length > 3 && password.length >= MIN_PASSWORD_LENGTH && !saving;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />

            <aside className="relative w-full max-w-lg bg-ink-900 border-l border-ink-600 h-full overflow-y-auto">
                <header className="sticky top-0 z-10 bg-ink-900 border-b border-ink-600 px-5 py-4 flex items-start gap-3">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <h2 className="text-base text-ink-100 font-medium">
                            {created ? "Account created" : "New user"}
                        </h2>
                        <p className="text-xs text-ink-500">
                            {created
                                ? "Pass these details on now. The password can't be shown again."
                                : "The account works exactly like a normal signup."}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-ink-500 hover:text-ink-100 shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </header>

                {created ? (
                    <div className="p-5 flex flex-col gap-4">
                        <Panel className="p-4 flex flex-col gap-3 border-green-500/30 bg-green-500/5">
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] text-ink-500">Email</span>
                                <span className="text-sm text-ink-100 break-all">{created.email}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] text-ink-500">Password</span>
                                <span className="text-sm text-ink-100 font-mono break-all">{created.password}</span>
                            </div>
                            <Button onClick={copyCredentials} size="sm" className="self-start">
                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? "Copied" : "Copy sign-in details"}
                            </Button>
                        </Panel>

                        <p className="text-xs text-ink-400 leading-relaxed">
                            {created.emailChoice === "none"
                                ? "No email was sent. Pass these details on yourself."
                                : created.welcomeSent
                                  ? created.emailChoice === "beta"
                                      ? "The beta invite has gone out, with the password in it. Nothing else to send."
                                      : "A welcome email has gone out, but it doesn't contain the password. Send that separately."
                                  : "The email failed to send, so pass these details on yourself. Check Ops → Mail for the reason."}{" "}
                            They can change the password themselves from the sign-in page using
                            &ldquo;Forgot password&rdquo;.
                        </p>

                        <div className="flex gap-2">
                            <Button
                                variant="primary"
                                onClick={() => {
                                    setCreated(null);
                                    setEmail("");
                                    setName("");
                                    setPassword(generatePassword());
                                }}
                            >
                                <UserPlus className="w-3.5 h-3.5" /> Create another
                            </Button>
                            <Button onClick={onClose}>Done</Button>
                        </div>
                    </div>
                ) : (
                    <div className="p-5 flex flex-col gap-4">
                        {error && (
                            <Panel className="p-3.5 border-red-500/30">
                                <p className="text-sm text-red-300">{error}</p>
                            </Panel>
                        )}

                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs text-ink-400">Email</span>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="their@email.com"
                                autoComplete="off"
                            />
                        </label>

                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs text-ink-400">Name (optional)</span>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Taken from the email if left blank"
                                autoComplete="off"
                            />
                        </label>

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
                                At least {MIN_PASSWORD_LENGTH} characters. You&apos;ll see it once after creating.
                                It isn&apos;t stored anywhere readable.
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs text-ink-400">Tier</span>
                                <Select value={tier} onChange={(e) => setTier(e.target.value)}>
                                    <option value="trial">Trial</option>
                                    <option value="pro">Pro</option>
                                    <option value="max">Max</option>
                                    <option value="comp">Comped</option>
                                </Select>
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs text-ink-400">Language</span>
                                <Select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
                                    {LOCALES.map((l) => (
                                        <option key={l} value={l}>{LOCALE_LABELS[l]}</option>
                                    ))}
                                </Select>
                            </label>
                        </div>

                        {tier === "trial" && (
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs text-ink-400">Trial length (days, 0 for none)</span>
                                <Input
                                    value={trialDays}
                                    onChange={(e) => setTrialDays(e.target.value)}
                                    inputMode="numeric"
                                    className="w-24 text-center"
                                />
                            </label>
                        )}

                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs text-ink-400">Email to send</span>
                            <Select
                                value={emailChoice}
                                onChange={(e) => setEmailChoice(e.target.value as EmailChoice)}
                            >
                                <option value="welcome">Welcome email</option>
                                <option value="beta">Beta tester invite</option>
                                <option value="none">Nothing</option>
                            </Select>
                            <span className="text-[11px] text-ink-500">
                                {emailChoice === "beta"
                                    ? "Sign-in details, the four beta tasks, and the password above. The only email that sends a password."
                                    : emailChoice === "welcome"
                                      ? "The same one a normal signup gets. It never contains the password."
                                      : "The account is created silently. You hand over the details yourself."}
                            </span>
                        </label>

                        <div className="flex flex-col gap-2.5 pt-1">
                            <Toggle
                                checked={emailVerified}
                                onChange={setEmailVerified}
                                label="Mark the email as verified"
                                hint="On, since you're confirming the address by creating the account yourself."
                            />
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-ink-600">
                            <Button variant="primary" onClick={submit} disabled={!canSubmit}>
                                {saving ? <Spinner className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                                Create account
                            </Button>
                            <Button onClick={onClose} variant="ghost">Cancel</Button>
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
}

function Toggle({
    checked,
    onChange,
    label,
    hint,
}: {
    checked: boolean;
    onChange: (value: boolean) => void;
    label: string;
    hint?: string;
}) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className="flex items-start gap-2.5 text-left group"
        >
            <span
                className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
                    checked ? "bg-green-500 border-green-500" : "border-ink-500 group-hover:border-ink-400"
                }`}
            >
                {checked && <Check className="w-3 h-3 text-ink-950" strokeWidth={3} />}
            </span>
            <span className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm text-ink-200">{label}</span>
                {hint && <span className="text-[11px] text-ink-500">{hint}</span>}
            </span>
        </button>
    );
}
