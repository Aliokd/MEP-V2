"use client";

import { useState } from 'react';
import type { GoldenStatus } from '@/lib/goldenTickets';
import { GOLDEN } from '../content';
import GoldenBadge from './GoldenBadge';
import ActivationCard, { type CardPrice } from './ActivationCard';

/**
 * The claim: the one form on a golden page, dressed as the activation card
 * (ActivationCard), whose Save posts the name and address to
 * /api/golden/claim. That marks the ticket taken and sends the code. The page never sees the code (a dry run on
 * a laptop is the exception, and says so). A ticket already taken shows the
 * taken state instead of the form, so nobody types into a dead end.
 */
export default function TakeTicket({ slug, status, price, holderName = '' }: { slug: string; status: GoldenStatus; price: CardPrice; holderName?: string }) {
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
                {/* Gold, not the product's green: every check mark on these
                    pages belongs to the program. */}
                {/* The program's own seal: the ticket is taken, in the ticket's gold. */}
                <GoldenBadge size={64} />
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

    // Opening the card is free; saving is the claim. The route sends the
    // code to the address on file when the founders have one, so what is
    // typed here is where it goes only for a ticket with none.
    const claim = async ({ name, email }: { name: string; email: string }): Promise<string | null> => {
        try {
            const res = await fetch('/api/golden/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, name, email, locale: 'en' }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setDone({ email, devCode: typeof data.devCode === 'string' ? data.devCode : null });
                return null;
            }
            if (data.error === 'taken') {
                setTaken(true);
                return c.errors.taken;
            }
            if (data.error === 'invalid-email') return c.errors.email;
            if (data.error === 'mail-failed') {
                // The claim stands; the founders see it in the console.
                setDone({ email, devCode: null });
                return null;
            }
            return c.errors.generic;
        } catch {
            return c.errors.generic;
        }
    };

    return <ActivationCard title={GOLDEN.activate.activeTitle} price={price} initialName={holderName} onSave={claim} />;
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
