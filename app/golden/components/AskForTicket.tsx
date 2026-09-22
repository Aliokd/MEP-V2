"use client";

import { useState } from 'react';
import { ArrowRight, Check, AlertCircle } from 'lucide-react';
import { GOLDEN } from '../content';

/** Matches MAX_ANSWER_LENGTH in /api/waitlist, which drops anything longer. */
const MAX_ABOUT = 120;

/**
 * Putting your hand up for a ticket nobody holds yet.
 *
 * Deliberately not a claim. A golden ticket is given, not taken: the founders
 * choose the hundred, and a page anyone can open must not hand out lifetime
 * access to whoever finds the link. So this records interest and says so.
 *
 * It posts to /api/waitlist with source "golden", which is the list the
 * console already shows (Waiting list), rather than a second pipeline that
 * nobody would remember to read. The ticket number rides along in the note so
 * the founders can see which one caught their eye.
 */
export default function AskForTicket({ number }: { number: number }) {
    const [email, setEmail] = useState('');
    const [about, setAbout] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<string | null>(null);
    const c = GOLDEN.free;

    if (done) {
        return (
            <Shell>
                <div className="w-12 h-12 rounded-full bg-[#86BE7F]/25 text-[#3f6b3a] flex items-center justify-center">
                    <Check size={24} strokeWidth={2.5} />
                </div>
                <h2 className="mt-5 text-2xl md:text-3xl tracking-tight">{c.askDoneTitle}</h2>
                <p className="mt-3 text-stone-600 leading-relaxed">{c.askDoneBody.replace('{email}', done)}</p>
            </Shell>
        );
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const trimmed = email.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setError(c.askInvalid);
            return;
        }
        setBusy(true);
        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: trimmed,
                    locale: 'en',
                    source: 'golden',
                    answers: { golden_ticket: String(number), about: about.trim().slice(0, MAX_ABOUT) },
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error === 'invalid-email' ? c.askInvalid : c.askError);
                return;
            }
            setDone(trimmed);
        } catch {
            setError(c.askError);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Shell>
            <h2 className="text-2xl md:text-3xl tracking-tight">{c.askTitle}</h2>
            <p className="mt-3 text-stone-600 leading-relaxed">{c.askBody}</p>
            <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
                {error && (
                    <div role="status" className="bg-red-500/10 border border-red-500/20 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                <label className="block">
                    <span className="block text-sm font-medium text-stone-700 mb-2">{GOLDEN.claim.emailLabel}</span>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={GOLDEN.claim.emailPlaceholder}
                        autoComplete="email"
                        disabled={busy}
                        className="w-full bg-white border border-stone-200 rounded-2xl py-3.5 px-5 text-stone-900 outline-none focus:border-[#C5A059] transition-colors text-base placeholder:text-stone-400"
                    />
                </label>
                <label className="block">
                    <span className="block text-sm font-medium text-stone-700 mb-2">{c.askAbout}</span>
                    <textarea
                        value={about}
                        onChange={(e) => setAbout(e.target.value.slice(0, MAX_ABOUT))}
                        placeholder={c.askAboutPlaceholder}
                        rows={2}
                        maxLength={MAX_ABOUT}
                        disabled={busy}
                        className="w-full bg-white border border-stone-200 rounded-2xl py-3.5 px-5 text-stone-900 outline-none focus:border-[#C5A059] transition-colors text-base placeholder:text-stone-400 resize-y"
                    />
                </label>
                <button
                    type="submit"
                    disabled={busy}
                    className="btn-press w-full md:w-auto px-8 py-4 text-lg font-semibold inline-flex items-center justify-center gap-3 select-none"
                >
                    <span>{busy ? c.askSending : c.askCta}</span>
                    {!busy && <ArrowRight className="w-5 h-5 stroke-[2.5px]" />}
                </button>
            </form>
        </Shell>
    );
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div id="ticket" className="scroll-mt-28 bg-white/50 border border-stone-300/50 rounded-[28px] p-7 md:p-12 backdrop-blur-sm">
            {children}
        </div>
    );
}
