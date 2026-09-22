"use client";

import { useMemo } from "react";
import { UserPlus } from "lucide-react";
import TicketArt from "@/app/golden/components/TicketArt";
import { STUB_X, W } from "@/app/golden/components/ticketShape";

/**
 * The hundred, as the console sees them.
 *
 * The same wall the website shows, drawn from the same SVG in the ink tone so
 * it belongs to the dark console rather than glaring out of it. Every place
 * is here, held or not, and every one of them is pressable: the sheet that
 * opens is where a ticket and its holder are actually managed. The wall's own
 * job is only to show the hundred and say which was pressed.
 */

export interface WallTicket {
    slug: string;
    number: number;
    name: string;
    tagline: string | null;
    photoUrl: string | null;
    status: "open" | "claimed" | "redeemed" | "revoked";
    listed: boolean;
    origin: "console" | "grant";
    redeemedBy: { uid: string; at: string; email: string | null } | null;
    claim: { email: string } | null;
}

export default function GoldenWall({
    tickets,
    total,
    canWrite,
    onPick,
    onPickFree,
}: {
    tickets: WallTicket[];
    total: number;
    canWrite: boolean;
    /** A ticket that exists, by slug. */
    onPick: (slug: string) => void;
    /** An empty place, by its number. */
    onPickFree: (number: number) => void;
}) {
    // Revoked tickets hold no place, so the wall shows the live ones and
    // draws every other number as free.
    const bySlot = useMemo(() => {
        const map = new Map<number, WallTicket>();
        tickets.filter((t) => t.status !== "revoked").forEach((t) => map.set(t.number, t));
        return map;
    }, [tickets]);

    const slots = useMemo(() => Array.from({ length: total }, (_, i) => i + 1), [total]);

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 p-5">
            {slots.map((n) => {
                const ticket = bySlot.get(n);
                return ticket ? (
                    <HeldTicket key={n} ticket={ticket} onPick={onPick} />
                ) : (
                    <FreeTicket key={n} number={n} canWrite={canWrite} onActivate={() => onPickFree(n)} />
                );
            })}
        </div>
    );
}

function HeldTicket({ ticket, onPick }: { ticket: WallTicket; onPick: (slug: string) => void }) {
    const holder = ticket.redeemedBy?.email || ticket.claim?.email || null;
    return (
        <button
            type="button"
            onClick={() => onPick(ticket.slug)}
            title={holder ? `Held by ${holder}` : ticket.name}
            className="group relative block w-full aspect-[5/3] rounded-[18px] overflow-hidden text-left transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-gold-500/60"
        >
            <TicketArt number={ticket.number} issued id={`admin-${ticket.slug}`} tone="ink" />

            <div className="absolute inset-y-0 left-0 flex flex-col justify-end p-[6.5%] pr-0" style={{ width: `${(STUB_X / W) * 100}%` }}>
                <div className="flex items-end gap-2.5">
                    <div className="w-[24%] max-w-[52px] aspect-square rounded-full overflow-hidden bg-ink-700 border border-ink-500 shrink-0">
                        {ticket.photoUrl ? (
                            <img src={ticket.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm text-ink-300 select-none">
                                {ticket.name.trim().charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 pb-0.5">
                        <p className="text-ink-100 text-[13px] md:text-sm font-semibold leading-tight truncate">{ticket.name}</p>
                        {holder && <p className="text-ink-400 text-[11px] leading-snug truncate">{holder}</p>}
                    </div>
                </div>
            </div>

            {/* Top right of the body, clear of the line the artwork prints
                along the top left and of the stub on the right. */}
            <div className="absolute top-[7%] right-[28%] flex items-center gap-1.5">
                {!ticket.listed && <Pill>hidden</Pill>}
                {ticket.origin === "grant" && <Pill>granted</Pill>}
            </div>
        </button>
    );
}

function FreeTicket({ number, canWrite, onActivate }: { number: number; canWrite: boolean; onActivate: () => void }) {
    const body = (
        <>
            <TicketArt number={number} issued={false} id={`admin-free-${number}`} tone="ink" />
            <div className="absolute inset-y-0 left-0 flex flex-col justify-end p-[6.5%] pr-0" style={{ width: `${(STUB_X / W) * 100}%` }}>
                <p className="text-ink-400 text-[13px] md:text-sm font-medium">Free</p>
            </div>
            {canWrite && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-3 py-1.5 text-[11px] font-semibold text-ink-950">
                        <UserPlus className="w-3.5 h-3.5" /> Activate
                    </span>
                </div>
            )}
        </>
    );

    if (!canWrite) {
        return (
            <div aria-hidden="true" className="relative aspect-[5/3] rounded-[18px] overflow-hidden opacity-70">
                {body}
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={onActivate}
            title={`Activate ticket ${number} for someone`}
            className="group relative block w-full aspect-[5/3] rounded-[18px] overflow-hidden text-left transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-gold-500/60"
        >
            {body}
        </button>
    );
}

function Pill({ children }: { children: React.ReactNode }) {
    return (
        <span className="rounded-full bg-ink-950/70 border border-ink-600 px-2 py-0.5 text-[10px] text-ink-300">{children}</span>
    );
}
