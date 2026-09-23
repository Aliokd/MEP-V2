"use client";

import { useState } from 'react';
import { GOLDEN } from '../content';
import GoldenBadge from './GoldenBadge';
import ActivationCard, { type CardPrice } from './ActivationCard';

/** Matches MAX_ANSWER_LENGTH in /api/waitlist, which drops anything longer. */
const MAX_ANSWER = 120;

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
export default function AskForTicket({ number, price }: { number: number; price: CardPrice }) {
    const [done, setDone] = useState<string | null>(null);
    const c = GOLDEN.free;

    if (done) {
        return (
            <Shell>
                {/* Gold, not the product's green: every check mark on these
                    pages belongs to the program, and one green tick among them
                    reads as a different thing having happened. */}
                {/* The program's own seal: the ticket is taken, in the ticket's gold. */}
                <GoldenBadge size={64} />
                <h2 className="mt-5 text-2xl md:text-3xl tracking-tight">{c.askDoneTitle}</h2>
                <p className="mt-3 text-stone-600 leading-relaxed">{c.askDoneBody.replace('{email}', done)}</p>
            </Shell>
        );
    }

    // Saving records the ask; nothing is handed out from a page anyone can
    // open. The number and the name ride with the address to the founders.
    const ask = async ({ name, email }: { name: string; email: string }): Promise<string | null> => {
        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    locale: 'en',
                    source: 'golden',
                    answers: { golden_ticket: String(number), name: name.slice(0, MAX_ANSWER) },
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                return data.error === 'invalid-email' ? c.askInvalid : c.askError;
            }
            setDone(email);
            return null;
        } catch {
            return c.askError;
        }
    };

    return (
        <ActivationCard
            title={GOLDEN.activate.requestTitle.replace('{number}', String(number))}
            price={price}
            onSave={ask}
        />
    );
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div id="ticket" className="scroll-mt-28 bg-white/50 border border-stone-300/50 rounded-[28px] p-7 md:p-12 backdrop-blur-sm">
            {children}
        </div>
    );
}
