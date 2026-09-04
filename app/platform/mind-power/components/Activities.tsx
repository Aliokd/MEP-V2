"use client";

import { useEffect, useState } from 'react';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useConnectionState } from '@/lib/connections';
import { ROOMS } from '@/lib/rooms';
import type { MindPowerProgress } from '@/lib/mindPowerContext';

/**
 * Activities: what the four areas of Veinote add up to. Create and Connect are
 * counts, set large; Learn and Practice are shares of a goal, as a bar with a
 * word for how it is going. The numbers come from the layout's Mind Power
 * context, except the two social ones, read here: accepted connections from
 * the connection listeners, rooms joined from a count query.
 */

const LOCALE: Record<string, string> = { en: 'en-GB', no: 'nb-NO', sv: 'sv-SE' };

interface ActivitiesProps {
    progress: MindPowerProgress;
    language: string;
    t: (key: string) => string;
}

/** A word for a share of the goal. */
function rating(ratio: number, t: (key: string) => string): string {
    if (ratio >= 1) return t('progress.rating_excellent');
    if (ratio >= 0.7) return t('progress.rating_great');
    if (ratio >= 0.4) return t('progress.rating_good');
    if (ratio > 0) return t('progress.rating_going');
    return t('progress.rating_start');
}

export default function Activities({ progress, language, t }: ActivitiesProps) {
    const { user } = useAuth();
    const { connections } = useConnectionState();
    const [rooms, setRooms] = useState(0);
    const nf = new Intl.NumberFormat(LOCALE[language] || 'en-GB');

    useEffect(() => {
        if (!user?.uid) return;
        let cancelled = false;
        getCountFromServer(query(collection(db, ROOMS), where('participants', 'array-contains', user.uid)))
            .then(snap => {
                if (!cancelled) setRooms(snap.data().count);
            })
            .catch(err => console.error('Error counting rooms:', err));
        return () => {
            cancelled = true;
        };
    }, [user?.uid]);

    const learn = Math.min(1, progress.completedLessonsCount / progress.lessonsGoal);
    const practice = Math.min(1, progress.practiceMinutes / progress.practiceGoal);
    const quote = progress.activeQuote.startsWith('progress.') ? t(progress.activeQuote) : progress.activeQuote;

    const stat = (value: number, unit: string) => (
        <span className="font-lyrics font-normal text-[30px] sm:text-[36px] leading-none text-stone-200 tabular-nums">
            {nf.format(value)} {unit}
        </span>
    );

    return (
        <section aria-labelledby="mp-activities-heading" className="flex flex-col gap-8">
            <h2 id="mp-activities-heading" className="font-lyrics font-normal text-[32px] leading-none text-[#F5F4EE]">
                {t('progress.activities_title')}
            </h2>

            <div className="flex flex-col gap-8">
                <Row label={t('progress.create')}>
                    <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2" data-activity="create">
                        {stat(progress.wordsTyped, t('progress.act_lyrics'))}
                        {stat(progress.recordingMinutes, t('progress.act_min_recordings'))}
                        {stat(progress.songsCompleted, t(progress.songsCompleted === 1 ? 'progress.act_song' : 'progress.act_songs'))}
                    </div>
                </Row>

                <Bar label={t('progress.learn')} ratio={learn} word={rating(learn, t)} name="learn" />
                <Bar label={t('progress.practice')} ratio={practice} word={rating(practice, t)} name="practice" />

                <Row label={t('progress.act_connect')}>
                    <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2" data-activity="connect">
                        {stat(connections.length, t(connections.length === 1 ? 'progress.act_connection' : 'progress.act_connections'))}
                        {stat(rooms, t(rooms === 1 ? 'progress.act_room' : 'progress.act_rooms'))}
                    </div>
                </Row>
            </div>

            <p className="text-[13px] italic text-stone-500 leading-relaxed">&ldquo;{quote}&rdquo;</p>
        </section>
    );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2">
            <span className="text-[14px] font-medium text-[#A9DE9F]">{label}</span>
            {children}
        </div>
    );
}

function Bar({ label, ratio, word, name }: { label: string; ratio: number; word: string; name: string }) {
    const percent = Math.round(ratio * 100);
    return (
        <div className="flex flex-col gap-2.5" data-activity={name}>
            <div className="flex items-baseline gap-3">
                <span className="text-[14px] font-medium text-[#A9DE9F]">{label}</span>
                <span className="text-[14px] text-stone-300 tabular-nums">{percent}%</span>
                <span className="text-[14px] text-stone-500">{word}</span>
            </div>
            <div
                className="h-2 w-full max-w-[420px] overflow-hidden rounded-full bg-black/40"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-label={label}
            >
                <div className="h-full rounded-full bg-[#86BE7F] transition-[width] duration-700 ease-out" style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}
