"use client";

import { useEffect, useMemo, useState } from 'react';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useConnectionState } from '@/lib/connections';
import { ROOMS } from '@/lib/rooms';
import { useTipMarks } from '@/lib/tipMarks';
import {
    LYRICS_IDEAS_BY_LANGUAGE,
    MELODY_IDEAS_BY_LANGUAGE,
    VIBE_IDEAS_BY_LANGUAGE,
    CHORDS_IDEAS_BY_LANGUAGE,
    type IdeaLanguage,
} from '@/app/platform/data/ideas';
import type { MindPowerProgress } from '@/lib/mindPowerContext';

/**
 * Activities: what the four areas of Veinote add up to, as the person would
 * recognise them.
 *
 * Create, Practice and Connect are counts, set large: words in your songs,
 * minutes recorded, songs finished; minutes practised, songs mapped, melody
 * variations sung; connections and rooms. Learn is the one with true
 * percentages — lectures mastered against the lectures in Master
 * fundamentals, and tips ticked against the tips in the bank — because both
 * have an end and the rest does not. An earlier version showed Practice as a
 * share of a 30-minute goal, which read "100%, Excellent" for good after one
 * afternoon; a number that stops moving is not progress.
 *
 * The numbers come from the layout's Mind Power context, except the ones
 * read here: the practice lists, the course size, accepted connections from
 * the connection listeners, rooms joined from a count query.
 */

const LOCALE: Record<string, string> = { en: 'en-GB', no: 'nb-NO', sv: 'sv-SE' };

interface ActivitiesProps {
    progress: MindPowerProgress;
    language: string;
    t: (key: string) => string;
}

function readList(key: string): number {
    if (typeof window === 'undefined') return 0;
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
        return 0;
    }
}

function readInt(key: string): number {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem(key) || '0', 10) || 0;
}

/** The tips shipped with the app for a language — the floor for the bank's size, before the CMS adds any. */
function builtInTipCount(language: string): number {
    const lang = (['en', 'no', 'sv'].includes(language) ? language : 'en') as IdeaLanguage;
    return [LYRICS_IDEAS_BY_LANGUAGE, MELODY_IDEAS_BY_LANGUAGE, VIBE_IDEAS_BY_LANGUAGE, CHORDS_IDEAS_BY_LANGUAGE].reduce(
        (sum, byLanguage) => sum + (byLanguage[lang] ?? byLanguage.en).length,
        0,
    );
}

export default function Activities({ progress, language, t }: ActivitiesProps) {
    const { user } = useAuth();
    const { tList } = useLanguage();
    const { connections } = useConnectionState();
    const { checked: checkedTips } = useTipMarks(user?.uid);
    const [rooms, setRooms] = useState(0);
    const [local, setLocal] = useState({ totalLessons: 0, totalTips: 0, songsMapped: 0, melodies: 0 });
    const nf = new Intl.NumberFormat(LOCALE[language] || 'en-GB');

    // The practice lists, the course size and the bank size live in
    // localStorage, kept by the Learn and Practice tabs; re-read whenever any
    // tab reports progress.
    useEffect(() => {
        const refresh = () =>
            setLocal({
                totalLessons: readInt('mep-total-lessons'),
                totalTips: readInt('mep-total-tips'),
                songsMapped: readList('mep-completed-practices'),
                melodies: readList('mep-completed-melody-variations'),
            });
        refresh();
        window.addEventListener('songwriting-progress-updated', refresh);
        return () => window.removeEventListener('songwriting-progress-updated', refresh);
    }, []);

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

    // A different proverb on every visit — picked once per mount, so it does
    // not flicker while the page is open.
    const quote = useMemo(() => {
        const proverbs = tList<string>('progress.proverbs');
        return proverbs.length > 0 ? proverbs[Math.floor(Math.random() * proverbs.length)] : '';
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language]);

    // Learn, in two parts. Lectures: mastered against Master fundamentals, when
    // its size is known; the old small goal otherwise, until the Learn tab has
    // been opened once. Tips: ticked against the bank — at least the tips
    // built in, more once the bank has been opened and counted the CMS ones.
    const totalLectures = local.totalLessons > 0 ? local.totalLessons : progress.lessonsGoal;
    const lectures = Math.min(1, progress.completedLessonsCount / Math.max(1, totalLectures));
    const totalTips = Math.max(local.totalTips, builtInTipCount(language));
    const tipsDone = Math.min(checkedTips.size, totalTips);
    const tips = Math.min(1, tipsDone / Math.max(1, totalTips));

    const stat = (value: number, unit: string) => (
        <span className="font-lyrics font-normal text-[30px] sm:text-[36px] leading-none text-stone-200 tabular-nums">
            {nf.format(value)} {unit}
        </span>
    );
    const plural = (n: number, one: string, other: string) => t(n === 1 ? one : other);

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
                        {stat(progress.songsCompleted, plural(progress.songsCompleted, 'progress.act_song', 'progress.act_songs'))}
                    </div>
                </Row>

                <Row label={t('progress.learn')}>
                    <div className="flex flex-col gap-4" data-activity="learn">
                        <Bar
                            label={t('progress.act_lectures')}
                            ratio={lectures}
                            detail={t('progress.act_lectures_of')
                                .replace('{done}', nf.format(progress.completedLessonsCount))
                                .replace('{total}', nf.format(totalLectures))}
                            name="lectures"
                        />
                        <Bar
                            label={t('progress.act_tips')}
                            ratio={tips}
                            detail={t('progress.act_tips_of').replace('{done}', nf.format(tipsDone)).replace('{total}', nf.format(totalTips))}
                            name="tips"
                        />
                    </div>
                </Row>

                <Row label={t('progress.practice')}>
                    <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2" data-activity="practice">
                        {stat(progress.practiceMinutes, t('progress.min_practiced'))}
                        {stat(local.songsMapped, plural(local.songsMapped, 'progress.act_song_mapped', 'progress.act_songs_mapped'))}
                        {stat(local.melodies, plural(local.melodies, 'progress.act_melody', 'progress.act_melodies'))}
                    </div>
                </Row>

                <Row label={t('progress.act_connect')}>
                    <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2" data-activity="connect">
                        {stat(connections.length, plural(connections.length, 'progress.act_connection', 'progress.act_connections'))}
                        {stat(rooms, plural(rooms, 'progress.act_room', 'progress.act_rooms'))}
                    </div>
                </Row>
            </div>

            {quote && <p className="text-[13px] italic text-stone-500 leading-relaxed" data-quote>&ldquo;{quote}&rdquo;</p>}
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

function Bar({ label, ratio, detail, name }: { label: string; ratio: number; detail: string; name: string }) {
    const percent = Math.round(ratio * 100);
    return (
        <div className="flex flex-col gap-2" data-activity={name}>
            <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-[14px] text-stone-300">{label}</span>
                <span className="text-[14px] text-stone-300 tabular-nums">{percent}%</span>
                <span className="text-[14px] text-stone-500">{detail}</span>
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
