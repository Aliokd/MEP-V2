"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { GOLDEN } from '../content';
import { GOLD, GOLD_GRADIENT, GOLD_PRESS } from '../goldPalette';
import { ACTIVATE_ANCHOR, ACTIVATE_EVENT } from '../activateEvent';

/**
 * The card a ticket page ends on.
 *
 * It plays in two acts. Scrolling it into view shows what the ticket does
 * to the price: a year of Veinote Pro is struck through and a zero takes its
 * place, with Activate still waiting underneath. Pressing Activate unfolds
 * the rest: the title, what the ticket holds, and the two fields that take
 * it. The order is the argument: the value falling away first, on sight,
 * then what you get for nothing, then your name.
 *
 * It owns only the reveal and the two fields. What saving means belongs to
 * the page: a named ticket is claimed, a free one is asked for. `onSave`
 * resolves with an error line to show, or nothing when it went through and
 * the parent has moved on to its done state.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

/** A year of Veinote Pro, as the page read it from Paddle. */
export interface CardPrice {
    amount: number;
    currency: string;
}

export default function ActivationCard({
    title,
    price,
    initialName = '',
    onSave,
}: {
    price: CardPrice;
    /** What the card says once pressed: "Active", or the ask on a free ticket. */
    title: string;
    initialName?: string;
    onSave: (values: { name: string; email: string }) => Promise<string | null>;
}) {
    const reduce = useReducedMotion();
    // Two acts. `priced`: the card has come into view and the price has been
    // struck through to zero. `open`: Activate was pressed and the benefits,
    // the fields and Save have come in.
    const [priced, setPriced] = useState(false);
    const [open, setOpen] = useState(false);
    // When the reveal starts, in seconds after the press. Long when the price
    // is still falling (it goes first), short when it fell a while ago.
    const [bodyBase, setBodyBase] = useState(1.0);
    const pricedAt = useRef<number | null>(null);
    // Activate has been pressed at some point, so the card comes back open
    // when it is scrolled back to, not just priced.
    const activated = useRef(false);
    // This opening came from a press. Only then does the page follow the
    // reveal down and the cursor go to a field; an opening that happened
    // because the visitor scrolled back does neither.
    const follow = useRef(false);
    const [name, setName] = useState(initialName);
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const nameRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const a = GOLDEN.activate;

    /**
     * Opens the card: the reveal after the price. If the price has not fallen
     * yet (the hero's Activate brings the card in and opens it in one go), it
     * falls now and the reveal waits for it; if it fell a while ago, the
     * reveal starts almost at once.
     */
    const openCard = useCallback((pressed: boolean) => {
        const now = Date.now();
        if (pricedAt.current === null) {
            pricedAt.current = now;
            setPriced(true);
        }
        const elapsed = (now - pricedAt.current) / 1000;
        setBodyBase(Math.min(1.0, Math.max(0.15, 1.15 - elapsed)));
        activated.current = true;
        follow.current = pressed;
        setOpen(true);
    }, []);

    /**
     * Back to how the card first looks: full price, Activate, nothing below.
     * What was typed stays in state, so it is still there when it reopens.
     */
    const closeCard = useCallback(() => {
        pricedAt.current = null;
        follow.current = false;
        setPriced(false);
        setOpen(false);
        setError('');
    }, []);

    // Coming into view strikes the price through. The hero's golden Activate
    // also arms the card to open when it arrives, so that press ends with the
    // whole card revealed rather than with a second Activate to find.
    //
    // Scrolling back up until the card has gone off the bottom of the screen
    // closes it again, and coming back down plays it again: the price falls,
    // and if Activate was pressed before, the rest opens after it. Only off
    // the bottom: the page goes on below the card, and reading on past it is
    // not a reason to take it apart.
    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;
        let armed = false;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) {
                    const bottom = entry.rootBounds?.bottom ?? window.innerHeight;
                    if (entry.boundingClientRect.top >= bottom && pricedAt.current !== null) closeCard();
                    return;
                }
                if (entry.intersectionRatio < 0.6) return;
                const replay = pricedAt.current === null;
                if (replay) {
                    pricedAt.current = Date.now();
                    setPriced(true);
                }
                if (armed) {
                    armed = false;
                    openCard(true);
                } else if (replay && activated.current) {
                    openCard(false);
                }
            },
            // 0 for leaving entirely, 0.6 for being properly in view.
            { threshold: [0, 0.6] },
        );
        io.observe(card);
        const onActivate = () => {
            armed = true;
            // Already in view: nothing will intersect anew, so open now.
            const r = card.getBoundingClientRect();
            const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
            if (visible >= r.height * 0.6) {
                armed = false;
                openCard(true);
            }
        };
        window.addEventListener(ACTIVATE_EVENT, onActivate);
        return () => {
            io.disconnect();
            window.removeEventListener(ACTIVATE_EVENT, onActivate);
        };
    }, [openCard, closeCard]);

    // Durations collapse to nothing for anyone who asked for less motion; the
    // card still opens, it just arrives rather than performs.
    const t = (seconds: number) => (reduce ? 0 : seconds);

    /**
     * The card opens downward: whatever brought it into view, the scroll ends
     * at its top, and the benefits, the fields and Save then grow below the
     * fold. Once the body has its full height, carry on down so the page
     * finishes where the form does, with Save on screen and a little room
     * under it. Nothing moves if the whole card already fits.
     */
    const revealEnd = () => {
        const card = cardRef.current;
        // Also called when the body finishes closing, off screen; and after
        // a reopen from scrolling, which the visitor is already doing.
        if (!card || !follow.current) return;
        follow.current = false;
        const overflow = card.getBoundingClientRect().bottom + 40 - window.innerHeight;
        if (overflow > 0) window.scrollBy({ top: overflow, behavior: reduce ? 'auto' : 'smooth' });
    };

    // Once the fields are in, the cursor goes to the first one still empty.
    useEffect(() => {
        if (!open || !follow.current) return;
        const id = window.setTimeout(() => {
            (initialName.trim() ? emailRef : nameRef).current?.focus({ preventScroll: true });
        }, reduce ? 0 : (bodyBase + 0.6) * 1000);
        return () => window.clearTimeout(id);
    }, [open, initialName, reduce, bodyBase]);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name.trim()) {
            setError(a.nameMissing);
            nameRef.current?.focus();
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setError(GOLDEN.claim.errors.email);
            emailRef.current?.focus();
            return;
        }
        setBusy(true);
        const problem = await onSave({ name: name.trim(), email: email.trim() }).catch(() => GOLDEN.claim.errors.generic);
        setBusy(false);
        if (problem) setError(problem);
    };

    return (
        <motion.div
            ref={cardRef}
            id={ACTIVATE_ANCHOR}
            layout
            transition={{ layout: { duration: t(0.6), ease: EASE } }}
            className="scroll-mt-28 rounded-[28px] border border-stone-300/60 bg-white/55 px-7 py-12 md:px-12 md:py-14 text-center backdrop-blur-sm"
        >
            {/* The top line: the button that opens it, then the word that
                says what happened. One swaps for the other in place. */}
            <div className="flex min-h-[56px] items-center justify-center">
                <AnimatePresence mode="wait" initial={false}>
                    {open ? (
                        <motion.h2
                            key="title"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: t(0.4), ease: EASE }}
                            className="text-3xl md:text-4xl tracking-tight text-stone-900"
                        >
                            {title}
                        </motion.h2>
                    ) : (
                        <motion.button
                            key="activate"
                            type="button"
                            onClick={() => openCard(true)}
                            exit={{ opacity: 0, scale: 0.94 }}
                            transition={{ duration: t(0.2) }}
                            // The hero's golden Activate, smaller: the same
                            // action, so the same gold.
                            style={{ backgroundImage: GOLD_GRADIENT, ['--press' as string]: GOLD_PRESS }}
                            className="golden-press rounded-full px-10 py-3.5 text-xl font-semibold text-stone-900 select-none"
                        >
                            {a.button}
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence initial={false}>
                {!open && (
                    <motion.p
                        key="label"
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: t(0.25) }}
                        className="mt-5 text-sm text-stone-600"
                    >
                        {a.valueLabel}
                    </motion.p>
                )}
            </AnimatePresence>

            {/* The price: the old one stays, struck through, and the zero
                arrives beside it. `layout` slides the old one aside for it. */}
            <motion.div layout className="mt-4 flex flex-wrap items-end justify-center gap-x-6 gap-y-1">
                <motion.span
                    layout
                    animate={{ opacity: priced ? 0.45 : 1 }}
                    transition={{ duration: t(0.4), delay: t(priced ? 0.55 : 0) }}
                    className="relative inline-flex items-end"
                >
                    <Price amount={price.amount} currency={price.currency} />
                    <motion.span
                        aria-hidden="true"
                        initial={false}
                        animate={{ scaleX: priced ? 1 : 0 }}
                        transition={{ duration: t(0.45), delay: t(priced ? 0.25 : 0), ease: EASE }}
                        style={{ originX: 0 }}
                        className="absolute left-[-4%] right-[-4%] top-[52%] h-[5px] md:h-[6px] rounded-full bg-stone-900"
                    />
                    {priced && <span className="sr-only">, now</span>}
                </motion.span>

                <AnimatePresence>
                    {priced && (
                        <motion.span
                            key="zero"
                            initial={{ opacity: 0, x: 24, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 24, scale: 0.9, transition: { duration: t(0.25) } }}
                            transition={{ duration: t(0.5), delay: t(0.7), ease: EASE }}
                            className="inline-flex items-end"
                            style={{ color: '#1c1917', textShadow: `0 0 36px ${GOLD.bright}80` }}
                        >
                            <Price amount={0} currency={price.currency} />
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        key="body"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0, transition: { duration: t(0.35), ease: EASE } }}
                        transition={{ duration: t(0.6), delay: t(bodyBase), ease: EASE }}
                        // Height is final here even though the fields are still
                        // fading in: they already take their space.
                        onAnimationComplete={revealEnd}
                        className="overflow-hidden"
                    >
                        <ul className="mx-auto mt-9 max-w-md space-y-2.5 text-left">
                            {GOLDEN.benefits.map(({ id, text }, i) => (
                                <motion.li
                                    key={id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: t(0.4), delay: t(bodyBase + 0.1 + i * 0.08), ease: EASE }}
                                    className="flex items-start gap-3 text-stone-700 leading-relaxed"
                                >
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: GOLD.deep }} />
                                    <span>{text}</span>
                                </motion.li>
                            ))}
                        </ul>

                        <form onSubmit={save} noValidate className="mx-auto mt-9 max-w-md space-y-4 text-left">
                            {error && (
                                <div role="status" className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                            <motion.label
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: t(0.4), delay: t(bodyBase + 0.55), ease: EASE }}
                                className="block"
                            >
                                <span className="sr-only">{a.nameLabel}</span>
                                <input
                                    ref={nameRef}
                                    value={name}
                                    onChange={(e) => setName(e.target.value.slice(0, 80))}
                                    placeholder={a.nameLabel}
                                    autoComplete="name"
                                    disabled={busy}
                                    className="w-full rounded-2xl border border-stone-300/70 bg-white/80 px-5 py-4 text-base text-stone-900 outline-none transition-colors placeholder:text-stone-500 focus:border-[#C5A059]"
                                />
                            </motion.label>
                            <motion.label
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: t(0.4), delay: t(bodyBase + 0.65), ease: EASE }}
                                className="block"
                            >
                                <span className="sr-only">{a.emailLabel}</span>
                                <input
                                    ref={emailRef}
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={a.emailLabel}
                                    autoComplete="email"
                                    disabled={busy}
                                    className="w-full rounded-2xl border border-stone-300/70 bg-white/80 px-5 py-4 text-base text-stone-900 outline-none transition-colors placeholder:text-stone-500 focus:border-[#C5A059]"
                                />
                            </motion.label>
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: t(0.4), delay: t(bodyBase + 0.8), ease: EASE }}
                                className="flex justify-center pt-4"
                            >
                                {/* Gold like both Activates: the same act, finished. */}
                                <button
                                    type="submit"
                                    disabled={busy}
                                    style={{ backgroundImage: GOLD_GRADIENT, ['--press' as string]: GOLD_PRESS }}
                                    className="golden-press inline-flex items-center gap-3 rounded-full px-10 py-3.5 text-lg font-semibold text-stone-900 select-none disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <span>{busy ? a.saving : a.save}</span>
                                    {!busy && <ArrowRight className="h-5 w-5 stroke-[2.5px]" />}
                                </button>
                            </motion.div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/**
 * "$468/year", the figure large and the period small beside its foot.
 * Whole units in the price's own currency, so the zero it falls to is written
 * the same way ("$0", "kr 0").
 */
function Price({ amount, currency }: { amount: number; currency: string }) {
    const a = GOLDEN.activate;
    const text = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        maximumFractionDigits: 0,
    }).format(amount);
    return (
        <>
            <span className="text-6xl md:text-7xl font-medium leading-none tracking-tight tabular-nums">
                {text}
            </span>
            <span className="mb-1 ml-1 text-base md:text-lg text-stone-700">{a.period}</span>
        </>
    );
}
