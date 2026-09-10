"use client";

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Play, ChevronRight } from 'lucide-react';
import BreathingExercise from './BreathingExercise';
import StayAheadSheet from './StayAheadSheet';
import { fetchStayAheadSessions } from '@/lib/contentClient';
import { PLACEHOLDER_SESSIONS } from '../data/placeholderSessions';
import type { Locale, StayAheadSessionDoc, StayAheadTrack } from '@/lib/content';

/**
 * Stay ahead: the body's part in the songwriting. Four cards in a row — the
 * breathing exercise, which runs here, and three tracks whose sessions are
 * authored in the admin console. The row scrolls on a phone and sits four
 * across on a desktop.
 *
 * A track card is live when its first session is published: nothing here is
 * flipped by hand, so an editor turns a card on by publishing into it and off
 * by archiving the last one. Until then it reads "Coming soon", which is the
 * truth rather than a placeholder.
 */

interface StayAheadProps {
    t: (key: string) => string;
    locale: Locale;
    /**
     * Rendered full-width above the card row — the focus timer lives here.
     * A slot rather than a fifth card: the clock needs more room than a card
     * gives, and it ticks, so the page keeps it in its own component to stop
     * every second re-rendering the cards beside it.
     */
    leading?: ReactNode;
}

/** `track` names the CMS sessions behind a card; the breathing card has none. */
const CARDS: { key: string; title: string; track: StayAheadTrack | null }[] = [
    { key: 'breathing', title: 'progress.sa_breathing', track: null },
    { key: 'finger', title: 'progress.sa_finger_tips', track: 'finger' },
    { key: 'yoga', title: 'progress.sa_yoga', track: 'yoga' },
    { key: 'holistic', title: 'progress.sa_holistic_sub', track: 'holistic' },
];

export default function StayAhead({ t, locale, leading }: StayAheadProps) {
    const [breathing, setBreathing] = useState(false);
    const [sessions, setSessions] = useState<StayAheadSessionDoc[] | null>(null);
    const [openTrack, setOpenTrack] = useState<StayAheadTrack | null>(null);

    // One read for all three cards. A failure leaves the cards saying "Coming
    // soon", which is what they said before the content existed — the section
    // is never the reason the page looks broken.
    //
    // In development, and only while the CMS has nothing of its own, the
    // placeholder sequence stands in so the sheet can be walked through before
    // the content exists. The check is compiled out of a production build.
    useEffect(() => {
        let cancelled = false;
        const settle = (rows: StayAheadSessionDoc[]) => {
            if (cancelled) return;
            setSessions(
                rows.length === 0 && process.env.NODE_ENV !== 'production' ? PLACEHOLDER_SESSIONS : rows,
            );
        };
        fetchStayAheadSessions()
            .then(settle)
            .catch(err => {
                console.error('Stay ahead sessions could not be read:', err);
                settle([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const byTrack = useMemo(() => {
        const map = new Map<StayAheadTrack, StayAheadSessionDoc[]>();
        for (const row of sessions || []) {
            if (!row.track) continue;
            const list = map.get(row.track) || [];
            list.push(row);
            map.set(row.track, list);
        }
        return map;
    }, [sessions]);

    const openCard = CARDS.find(c => c.track && c.track === openTrack) || null;

    return (
        <section aria-labelledby="mp-stay-ahead-heading" className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
                <h2 id="mp-stay-ahead-heading" className="font-lyrics font-normal text-[32px] leading-none text-[#F5F4EE]">
                    {t('progress.stay_ahead_title')}
                </h2>
                <p className="text-[12.5px] text-stone-500">{t('progress.stay_ahead_sub')}</p>
            </div>

            {leading}

            <div className="mind-power-carousel -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
                {CARDS.map(card => {
                    const trackSessions = card.track ? byTrack.get(card.track) || [] : [];
                    const live = card.track ? trackSessions.length > 0 : true;
                    const open = () => {
                        if (card.track) setOpenTrack(card.track);
                        else setBreathing(true);
                    };

                    const body = (
                        <>
                            <div className="flex flex-col gap-3">
                                <h3 className="font-lyrics font-normal text-[28px] leading-[1.1] text-[#F5F4EE]">
                                    {t(card.title)}
                                </h3>
                            </div>
                            {live ? (
                                <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[20px] font-medium text-[#F5F4EE] transition-colors group-hover:bg-white/10">
                                    {card.track ? (
                                        <>
                                            {t('progress.sa_open')}
                                            <ChevronRight size={20} strokeWidth={2} aria-hidden />
                                        </>
                                    ) : (
                                        <>
                                            <Play size={20} strokeWidth={0} fill="currentColor" aria-hidden />
                                            {t('progress.sa_start')}
                                        </>
                                    )}
                                </span>
                            ) : (
                                <span className="absolute bottom-4 text-[11px] text-stone-600">{t('progress.sa_soon')}</span>
                            )}
                        </>
                    );

                    const shell =
                        'group relative flex min-h-[250px] basis-[76%] shrink-0 snap-center flex-col items-center justify-center gap-5 rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-8 text-center sm:basis-[calc(50%-8px)] lg:basis-auto';

                    return live ? (
                        <button
                            key={card.key}
                            type="button"
                            onClick={open}
                            data-card={card.key}
                            data-live
                            className={`${shell} transition-colors hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86BE7F] cursor-pointer`}
                        >
                            {body}
                        </button>
                    ) : (
                        <div key={card.key} data-card={card.key} className={shell}>
                            {body}
                        </div>
                    );
                })}
            </div>

            <BreathingExercise open={breathing} onClose={() => setBreathing(false)} t={t} />

            <StayAheadSheet
                cardTitle={openCard ? t(openCard.title) : null}
                sessions={openTrack ? byTrack.get(openTrack) || [] : []}
                locale={locale}
                t={t}
                onClose={() => setOpenTrack(null)}
            />
        </section>
    );
}
