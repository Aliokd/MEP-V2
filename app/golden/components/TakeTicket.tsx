"use client";

import { useState } from 'react';
import { ArrowRight, Check, AlertCircle } from 'lucide-react';
import type { GoldenStatus } from '@/lib/goldenTickets';
import { GOLDEN } from '../content';

/**
 * The claim: the one form on a golden page.
 *
 * Posts the address to /api/golden/claim, which marks the ticket taken and
 * sends the code to that inbox. The page never sees the code (a dry run on
 * a laptop is the exception, and says so). A ticket already taken shows the
 * taken state instead of the form, so nobody types into a dead end.
 */
export default function TakeTicket({ slug, status }: { slug: string; status: GoldenStatus }) {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<{ email: string; devCode: string | null } | null>(null);
    const [taken, setTaken] = useState(status === 'claimed' || status === 'redeemed');
    const c = GOLDEN.claim;

    if (status === 'revoked') {
        return (
            <Shell>
                <h2 className="text-2xl md:text-3xl tracking-tight">{c.revokedTitle}</h2>
                <p className="mt-3 text-stone-600 leading-relaxed">{c.revokedBody}</p>
                <Contact />
            </Shell>
        );
    }

    if (done) {
        return (
            <Shell>
                <div className="w-12 h-12 rounded-full bg-[#86BE7F]/25 text-[#3f6b3a] flex items-center justify-center">
                    <Check size={24} strokeWidth={2.5} />
                </div>
                <h2 className="mt-5 text-2xl md:text-3xl tracking-tight">{c.doneTitle}</h2>
                <p className="mt-3 text-stone-600 leading-relaxed">
                    {c.doneBody.replace('{email}', done.email)}
                </p>
                {done.devCode && (
                    <p className="mt-5 text-xs text-stone-500">
                        Dry run, nothing was sent. The code that would have gone out:{' '}
                        <span className="font-mono font-semibold text-stone-800 tracking-wider">{done.devCode}</span>
                    </p>
                )}
            </Shell>
        );
    }

    if (taken) {
        return (
            <Shell>
                <h2 className="text-2xl md:text-3xl tracking-tight">{c.takenTitle}</h2>
                <p className="mt-3 text-stone-600 leading-relaxed">{c.takenBody}</p>
                <Contact />
            </Shell>
        );
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const trimmed = email.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setError(c.errors.email);
            return;
        }
        setBusy(true);
        try {
            const res = await fetch('/api/golden/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, email: trimmed, message: message.trim() || undefined, locale: 'en' }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setDone({ email: trimmed, devCode: typeof data.devCode === 'string' ? data.devCode : null });
                return;
            }
            if (data.error === 'taken') {
                setTaken(true);
                setError(c.errors.taken);
            } else if (data.error === 'invalid-email') {
                setError(c.errors.email);
            } else if (data.error === 'mail-failed') {
                // The claim stands; the founders see it in the console.
                setDone({ email: trimmed, devCode: null });
                setError(c.errors.mail);
            } else {
                setError(c.errors.generic);
            }
        } catch {
            setError(c.errors.generic);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Shell>
            <h2 className="text-2xl md:text-3xl tracking-tight">{c.title}</h2>
            <p className="mt-3 text-stone-600 leading-relaxed">{c.body}</p>
            <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
                {error && (
                    <div role="status" className="bg-red-500/10 border border-red-500/20 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                <label className="block">
                    <span className="block text-sm font-medium text-stone-700 mb-2">{c.emailLabel}</span>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={c.emailPlaceholder}
                        autoComplete="email"
                        disabled={busy}
                        className="w-full bg-white border border-stone-200 rounded-2xl py-3.5 px-5 text-stone-900 outline-none focus:border-[#C5A059] transition-colors text-base placeholder:text-stone-400"
                    />
                </label>
                <label className="block">
                    <span className="block text-sm font-medium text-stone-700 mb-2">{c.messageLabel}</span>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value.slice(0, 600))}
                        placeholder={c.messagePlaceholder}
                        rows={3}
                        disabled={busy}
                        className="w-full bg-white border border-stone-200 rounded-2xl py-3.5 px-5 text-stone-900 outline-none focus:border-[#C5A059] transition-colors text-base placeholder:text-stone-400 resize-y"
                    />
                </label>
                <button
                    type="submit"
                    disabled={busy}
                    className="btn-press w-full md:w-auto px-8 py-4 text-lg font-semibold inline-flex items-center justify-center gap-3 select-none"
                >
                    <span>{busy ? c.sending : GOLDEN.cta}</span>
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

function Contact() {
    return (
        <a href={`mailto:${GOLDEN.claim.contact}`} className="mt-5 inline-block text-stone-900 font-medium underline underline-offset-4 decoration-stone-400 hover:decoration-stone-900">
            {GOLDEN.claim.contact}
        </a>
    );
}
