"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, Check, Play, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { pickLocale, type Locale, type StayAheadSessionDoc } from '@/lib/content';
import { isBlockRenderable, type LessonBlock } from '@/lib/lessonBlocks';
import LessonBlocks from '@/app/platform/components/LessonBlocks';
import { toggleStayAheadDone, useStayAheadDone } from '@/lib/stayAheadMarks';

/**
 * A Stay ahead card, opened: the sequence of sessions behind it, read one at a
 * time in a sheet that slides in from the right.
 *
 * A sheet rather than a dialog because the sequence is a place you stay in for
 * a while — the page it came from stays visible down the left, dimmed, so it
 * is obvious you are inside one card and not on a new screen. Moving between
 * sessions is vertical, down the list and back up, which is the shape of the
 * thing being moved through.
 *
 * Everything shown is authored in the admin console (Content > Mind Power >
 * Stay ahead). The sheet knows how to draw a title, a standfirst, a video and
 * the block list, and nothing else reaches it.
 */

interface StayAheadSheetProps {
    /** Null closes the sheet. The card's own title, for the header. */
    cardTitle: string | null;
    sessions: StayAheadSessionDoc[];
    locale: Locale;
    t: (key: string) => string;
    onClose: () => void;
}

export default function StayAheadSheet({ cardTitle, sessions, locale, t, onClose }: StayAheadSheetProps) {
    const { user } = useAuth();
    const done = useStayAheadDone(user?.uid);
    const [index, setIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const sectionRefs = useRef<(HTMLElement | null)[]>([]);

    const open = cardTitle !== null && sessions.length > 0;
    const session = sessions[index];

    // The sessions are one column, not one card at a time: the arrows travel
    // down it and so does a plain scroll, which is why the header reads from
    // whatever is in view rather than from what was last clicked.
    //
    // While an arrow's scroll is still travelling the header would otherwise
    // flicker back to the section being passed through, so tracking is held
    // until the journey lands. The timeout is the release valve: a guard that
    // could only be cleared by arriving would stick forever if the scroll were
    // interrupted.
    const pendingRef = useRef<number | null>(null);
    const pendingTimer = useRef<number | null>(null);
    useEffect(() => () => {
        if (pendingTimer.current !== null) window.clearTimeout(pendingTimer.current);
    }, []);

    /**
     * Where a section sits in the scroll, measured from the first one rather
     * than from the container: both are positioned against the sheet, and the
     * reading area's own top padding would otherwise put session one at 20
     * instead of 0 and clip the air above it.
     */
    const offsetOf = (i: number) => {
        const section = sectionRefs.current[i];
        const first = sectionRefs.current[0];
        return section && first ? section.offsetTop - first.offsetTop : 0;
    };

    const scrollTo = (target: number) => {
        const container = scrollRef.current;
        const section = sectionRefs.current[target];
        if (!container || !section) return;
        setIndex(target);
        pendingRef.current = target;
        if (pendingTimer.current !== null) window.clearTimeout(pendingTimer.current);
        pendingTimer.current = window.setTimeout(() => {
            pendingRef.current = null;
        }, 900);
        container.scrollTo({
            top: offsetOf(target),
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        });
    };

    /** Whichever section covers the top of the reading area is the one being read. */
    const onScroll = () => {
        const container = scrollRef.current;
        if (!container) return;
        const line = container.scrollTop + 80;
        let current = 0;
        sectionRefs.current.forEach((section, i) => {
            if (section && offsetOf(i) <= line) current = i;
        });
        if (pendingRef.current !== null) {
            if (current !== pendingRef.current) return;
            pendingRef.current = null;
            if (pendingTimer.current !== null) window.clearTimeout(pendingTimer.current);
        }
        setIndex(prev => (prev === current ? prev : current));
    };

    // A new card opens at its first session rather than wherever the last one
    // was left.
    useEffect(() => {
        if (!open) return;
        setIndex(0);
        scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }, [open, cardTitle]);

    // Escape closes, and the page behind must not scroll under the sheet.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = previous;
        };
    }, [open, onClose]);

    /** Each session's renderable blocks, worked out once for the whole column. */
    const blocksBySession = useMemo(
        () =>
            sessions.map(s => ((s.blocks as LessonBlock[]) || []).filter(b => isBlockRenderable(b, locale))),
        [sessions, locale],
    );

    if (!open || typeof document === 'undefined' || !session) return null;

    const isDone = done.has(session.id);
    const atFirst = index === 0;
    const atLast = index >= sessions.length - 1;

    return createPortal(
        <div className="fixed inset-0 z-[300] flex justify-end" role="presentation">
            {/* The page stays visible down the left, dimmed: you are inside a
                card, not on a different screen. */}
            <button
                type="button"
                aria-label={t('progress.sa_close')}
                onClick={onClose}
                className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
            />

            <aside
                role="dialog"
                aria-modal="true"
                aria-label={cardTitle}
                data-stay-ahead-sheet
                className="stay-ahead-sheet relative flex h-full w-full max-w-[860px] flex-col rounded-l-[28px] bg-[#2B2B2B] shadow-[-26px_0_70px_rgba(0,0,0,0.55)] sm:w-[92%] lg:w-[70%]"
            >
                {/* The actions sit above the title on a phone and beside it from
                    sm up: at 375px a title sharing its row with two controls wraps
                    to three lines and stops looking like a heading. */}
                <header className="flex shrink-0 flex-col-reverse gap-3 px-7 pt-7 sm:flex-row sm:items-start sm:gap-4 sm:px-10 sm:pt-9">
                    <div className="flex min-w-0 flex-col gap-1">
                        <span className="text-[12px] text-stone-500">{cardTitle}</span>
                        <h2 className="font-lyrics font-normal text-[28px] leading-[1.15] text-[#F5F4EE] sm:text-[32px]">
                            {index + 1}. {pickLocale(session.title, locale)}
                        </h2>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
                        {/* Marking one complete is what carries it into the week's
                            health score, so it is the sheet's primary control. */}
                        <button
                            type="button"
                            onClick={() => toggleStayAheadDone(session.id, user?.uid)}
                            data-mark-complete
                            aria-pressed={isDone}
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86BE7F] ${
                                isDone
                                    ? 'border-[#86BE7F]/45 bg-[#86BE7F]/15 text-[#A9DE9F]'
                                    : 'border-white/15 text-stone-300 hover:bg-white/[0.07] hover:text-[#F5F4EE]'
                            }`}
                        >
                            <Check size={15} strokeWidth={2.2} aria-hidden />
                            {isDone ? t('progress.sa_completed') : t('progress.sa_mark_complete')}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label={t('progress.sa_close')}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-white/[0.08] hover:text-[#F5F4EE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86BE7F] cursor-pointer"
                        >
                            <X size={19} strokeWidth={1.8} aria-hidden />
                        </button>
                    </div>
                </header>

                <div
                    ref={scrollRef}
                    onScroll={onScroll}
                    className="mind-power-scrollbar flex-1 overflow-y-auto px-7 pb-6 pt-5 sm:px-10"
                >
                    {sessions.map((s, i) => {
                        const blocks = blocksBySession[i];
                        const description = pickLocale(s.description, locale);
                        return (
                            <section
                                key={s.id}
                                ref={el => {
                                    sectionRefs.current[i] = el;
                                }}
                                data-session-section={i}
                                aria-label={pickLocale(s.title, locale)}
                                // A rule and real air between sessions: the title
                                // lives in the header, so this is what says one has
                                // ended and the next begun.
                                className={i > 0 ? 'mt-12 border-t border-white/[0.07] pt-12' : ''}
                            >
                                {description && (
                                    <p className="mb-6 max-w-[70ch] whitespace-pre-line text-[15px] leading-relaxed text-stone-400">
                                        {description}
                                    </p>
                                )}

                                {s.videoUrl ? (
                                    <video
                                        controls
                                        // Nothing is fetched until it is played: the
                                        // whole sequence is on the page at once.
                                        preload="none"
                                        poster={s.posterUrl || undefined}
                                        src={s.videoUrl}
                                        className="w-full rounded-[18px] border border-white/10 bg-black"
                                    />
                                ) : (
                                    blocks.length === 0 && (
                                        // A session with neither a video nor a block is
                                        // one an editor published early. Show the frame
                                        // rather than a gap that reads as a failure.
                                        <div className="flex aspect-video w-full items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.03]">
                                            <Play size={54} strokeWidth={0} fill="rgba(245,244,238,0.16)" aria-hidden />
                                        </div>
                                    )
                                )}

                                {blocks.length > 0 && (
                                    <div className="mt-7">
                                        <LessonBlocks blocks={blocks} locale={locale} tone="dark" />
                                    </div>
                                )}
                            </section>
                        );
                    })}

                    {/* The last session can reach the top of the reading area like
                        every other one, so the arrows keep working down to the end. */}
                    <div aria-hidden className="h-[45vh]" />
                </div>

                {/* Down the sequence and back up. Disabled at the ends rather than
                    hidden, so the controls do not move as you travel. */}
                <footer className="flex shrink-0 items-center justify-center gap-3 px-7 pb-7 pt-2 sm:px-10 sm:pb-9">
                    <SheetArrow
                        direction="up"
                        disabled={atFirst}
                        label={t('progress.sa_previous')}
                        onClick={() => scrollTo(Math.max(0, index - 1))}
                    />
                    <span className="px-2 text-[12px] tabular-nums text-stone-500">
                        {index + 1} / {sessions.length}
                    </span>
                    <SheetArrow
                        direction="down"
                        disabled={atLast}
                        label={t('progress.sa_next')}
                        onClick={() => scrollTo(Math.min(sessions.length - 1, index + 1))}
                    />
                </footer>
            </aside>
        </div>,
        document.body,
    );
}

function SheetArrow({
    direction,
    disabled,
    label,
    onClick,
}: {
    direction: 'up' | 'down';
    disabled: boolean;
    label: string;
    onClick: () => void;
}) {
    const Icon = direction === 'up' ? ArrowUp : ArrowDown;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            data-sheet-arrow={direction}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-stone-300 transition-colors hover:bg-white/[0.08] hover:text-[#F5F4EE] disabled:opacity-25 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86BE7F] cursor-pointer disabled:cursor-not-allowed"
        >
            <Icon size={19} strokeWidth={1.8} aria-hidden />
        </button>
    );
}
