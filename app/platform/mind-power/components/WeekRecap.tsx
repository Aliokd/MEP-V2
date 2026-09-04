"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { safeLocalStorageSetItem } from '@/lib/storage';
import { PenLine, Mic, CheckCircle2, BookOpen, Music, Wind, Share2, Users, DoorOpen, CalendarCheck, Check } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { fetchUsersByUid, CONNECTION_REQUESTS } from '@/lib/connections';
import { ROOMS } from '@/lib/rooms';
import { weekRecapLocal, type WeekCell } from '@/lib/weeklyActivity';
import { WEEKLY_TARGET } from '@/lib/mindPowerScore';
import { BRAIN_SM_SRC, BRAIN_GOLD_SM_SRC } from './brainGeometry';
import * as btn from '@/app/platform/components/buttonStyles';

/**
 * Looking back at one week: what the person actually did in it, by name where
 * a name exists. The local record gives the time, the days, the words and
 * minutes and chapters; Firestore gives the things that carry dates of their
 * own — the songs touched, the songs shared, the rooms joined, the people
 * connected with. Each source is read once per account and kept, so opening
 * a second week costs nothing, and any source that fails is simply left out.
 */

const LOCALE: Record<string, string> = { en: 'en-GB', no: 'nb-NO', sv: 'sv-SE' };
const WEEK_MS = 7 * 24 * 3600 * 1000;

interface Dated {
    label: string;
    at: number;
    /** The document's id — the song, post, room or person the label names. */
    id: string;
}
interface Evidence {
    songs: Dated[];
    shares: Dated[];
    rooms: Dated[];
    /** Accepted connections, labelled with the other person's name. */
    people: Dated[];
}

const evidenceCache = new Map<string, Promise<Evidence>>();

async function loadEvidence(uid: string): Promise<Evidence> {
    const settled = async <T,>(work: Promise<T>, fallback: T): Promise<T> => {
        try {
            return await work;
        } catch (err) {
            console.error('Week recap: a source could not be read', err);
            return fallback;
        }
    };

    const songs = settled(
        getDocs(query(collection(db, 'projects'), where('ownerId', '==', uid))).then(snap => {
            const out: Dated[] = [];
            snap.forEach(d => {
                const data = d.data();
                const at = typeof data.updatedAt === 'string' ? Date.parse(data.updatedAt) : NaN;
                if (!Number.isNaN(at)) out.push({ label: data.title || '', at, id: d.id });
            });
            return out;
        }),
        [],
    );
    const shares = settled(
        getDocs(query(collection(db, 'connect_posts'), where('authorId', '==', uid))).then(snap => {
            const out: Dated[] = [];
            snap.forEach(d => {
                const data = d.data();
                if (typeof data.createdAt === 'number') out.push({ label: data.projectName || '', at: data.createdAt, id: d.id });
            });
            return out;
        }),
        [],
    );
    const rooms = settled(
        getDocs(query(collection(db, ROOMS), where('participants', 'array-contains', uid))).then(snap => {
            const out: Dated[] = [];
            snap.forEach(d => {
                const data = d.data();
                const at = typeof data.startsAt === 'number' ? data.startsAt : data.createdAt;
                if (typeof at === 'number') out.push({ label: data.title || '', at, id: d.id });
            });
            return out;
        }),
        [],
    );
    const people = settled(
        Promise.all([
            getDocs(query(collection(db, CONNECTION_REQUESTS), where('fromUid', '==', uid))),
            getDocs(query(collection(db, CONNECTION_REQUESTS), where('toUid', '==', uid))),
        ]).then(async ([sent, received]) => {
            const accepted: { other: string; at: number }[] = [];
            sent.forEach(d => {
                const data = d.data();
                if (data.status === 'accepted' && typeof data.respondedAt === 'number') accepted.push({ other: data.toUid, at: data.respondedAt });
            });
            received.forEach(d => {
                const data = d.data();
                if (data.status === 'accepted' && typeof data.respondedAt === 'number') accepted.push({ other: data.fromUid, at: data.respondedAt });
            });
            const profiles = await fetchUsersByUid(accepted.map(a => a.other));
            const names = new Map(profiles.map(p => [p.uid, p.name]));
            return accepted.map(a => ({ label: names.get(a.other) || '', at: a.at, id: a.other })).filter(a => a.label);
        }),
        [],
    );

    const [s, sh, r, p] = await Promise.all([songs, shares, rooms, people]);
    return { songs: s, shares: sh, rooms: r, people: p };
}

interface WeekRecapProps {
    week: WeekCell | null;
    onClose: () => void;
    language: string;
    t: (key: string) => string;
}

export default function WeekRecap({ week, onClose, language, t }: WeekRecapProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [evidence, setEvidence] = useState<Evidence | null>(null);

    // Each name is a way to the thing it names. A song opens on the canvas the
    // way the workspace list opens one: by leaving its id where Create looks.
    const openSong = (id: string) => {
        if (user?.uid) safeLocalStorageSetItem(`veinote-selected-note-id-${user.uid}`, id);
        safeLocalStorageSetItem('veinote-selected-note-id', id);
        onClose();
        router.push('/platform/create');
    };
    const go = (href: string) => {
        onClose();
        router.push(href);
    };

    useEffect(() => {
        if (!week || !user?.uid) return;
        let cancelled = false;
        setEvidence(null);
        let pending = evidenceCache.get(user.uid);
        if (!pending) {
            pending = loadEvidence(user.uid);
            evidenceCache.set(user.uid, pending);
        }
        pending.then(e => {
            if (!cancelled) setEvidence(e);
        });
        return () => {
            cancelled = true;
        };
    }, [week, user?.uid]);

    useEffect(() => {
        if (!week) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [week, onClose]);

    if (!week || typeof document === 'undefined') return null;

    const local = weekRecapLocal(week.key);
    const from = week.start.getTime();
    const to = from + WEEK_MS;
    const inWeek = (items: Dated[]) => items.filter(i => i.at >= from && i.at < to);
    const fmt = new Intl.DateTimeFormat(LOCALE[language] || 'en-GB', { day: 'numeric', month: 'short' });
    const end = new Date(week.start);
    end.setDate(end.getDate() + 6);
    const nf = new Intl.NumberFormat(LOCALE[language] || 'en-GB');
    const fill = (key: string, n: number) => t(key).replace('{n}', nf.format(n));
    const plural = (n: number, one: string, other: string) => fill(n === 1 ? one : other, n);

    type Named = { label: string; onOpen: () => void };
    const lines: { icon: ReactNode; text: string; names?: Named[] }[] = [];
    if (local.visitDays > 0) {
        lines.push({
            icon: <CalendarCheck size={16} />,
            text: `${plural(local.visitDays, 'progress.recap_days_one', 'progress.recap_days_other')} · ${local.minutes} ${t('progress.mp_minutes_short')}`,
        });
    }
    // Songs finished this week, by name where the canvas noted when — it has
    // since the recap existed; before that, only the count survives.
    const finishedAt: Record<string, number> = (() => {
        try {
            return JSON.parse(localStorage.getItem('mep-completed-song-dates') || '{}');
        } catch {
            return {};
        }
    })();
    const finishedIds = Object.entries(finishedAt)
        .filter(([, at]) => at >= from && at < to)
        .map(([id]) => id);
    const titleOf = (id: string) => evidence?.songs.find(s => s.id === id)?.label || '';

    if (local.craft) {
        const c = local.craft;
        if (c.words > 0) lines.push({ icon: <PenLine size={16} />, text: fill('progress.recap_words', c.words) });
        if (c.recordingSeconds >= 60) lines.push({ icon: <Mic size={16} />, text: fill('progress.recap_recording', Math.round(c.recordingSeconds / 60)) });
        const finishedCount = Math.max(c.sections, finishedIds.length);
        if (finishedCount > 0) {
            lines.push({
                icon: <CheckCircle2 size={16} />,
                text: plural(finishedCount, 'progress.recap_songs_one', 'progress.recap_songs_other'),
                names: finishedIds
                    .map(id => ({ label: titleOf(id) || t('connect.untitled_song'), onOpen: () => openSong(id) })),
            });
        }
        if (c.chapters > 0) lines.push({ icon: <BookOpen size={16} />, text: plural(c.chapters, 'progress.recap_chapters_one', 'progress.recap_chapters_other') });
        if (c.practiceSeconds >= 60) lines.push({ icon: <Music size={16} />, text: fill('progress.recap_practice', Math.round(c.practiceSeconds / 60)) });
    }
    if (local.healthMarks > 0) lines.push({ icon: <Wind size={16} />, text: plural(local.healthMarks, 'progress.recap_health_one', 'progress.recap_health_other') });

    const named = (items: Dated[], onOpen: (item: Dated) => void): Named[] =>
        inWeek(items)
            .filter(i => i.label)
            .map(i => ({ label: i.label, onOpen: () => onOpen(i) }));
    const songs = evidence ? named(evidence.songs, s => openSong(s.id)) : [];
    const shares = evidence ? named(evidence.shares, () => go('/platform/connect')) : [];
    const rooms = evidence ? named(evidence.rooms, r => go(`/platform/profile/rooms/${r.id}`)) : [];
    const people = evidence ? named(evidence.people, p => go(`/platform/profile/u/${p.id}`)) : [];
    if (songs.length) lines.push({ icon: <PenLine size={16} />, text: t('progress.recap_worked_on'), names: songs });
    if (shares.length) lines.push({ icon: <Share2 size={16} />, text: t('progress.recap_shared'), names: shares });
    if (people.length) lines.push({ icon: <Users size={16} />, text: t('progress.recap_connected'), names: people });
    if (rooms.length) lines.push({ icon: <DoorOpen size={16} />, text: t('progress.recap_rooms'), names: rooms });

    const quiet = evidence !== null && lines.length === 0;

    return createPortal(
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="mp-recap-title"
                data-week-recap={week.index}
                onClick={e => e.stopPropagation()}
                className="golden-pop-in mind-power-scrollbar relative flex max-h-[90vh] w-full max-w-[520px] flex-col gap-6 overflow-y-auto rounded-3xl bg-[#2a2a2a] px-7 py-8 text-[#F5F4EE] shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:px-10"
            >
                <div className="flex items-start gap-4">
                    <div className="relative -my-2 h-[66px] w-[88px] shrink-0" aria-hidden>
                        <img src={week.golden ? BRAIN_GOLD_SM_SRC : BRAIN_SM_SRC} alt="" className="absolute inset-0 h-full w-full object-contain" style={week.golden ? undefined : { filter: 'grayscale(1) brightness(0.8)' }} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <h2 id="mp-recap-title" className="font-lyrics font-normal text-[28px] leading-none">
                            {t('progress.recap_title').replace('{n}', String(week.index))}
                        </h2>
                        <p className="text-[13px] text-stone-500 tabular-nums">
                            {fmt.format(week.start)} – {fmt.format(end)}
                            {local.score && (
                                <> · {t('progress.mp_score_of').replace('{score}', String(local.score.score)).replace('{target}', String(WEEKLY_TARGET))}</>
                            )}
                        </p>
                        {week.golden && (
                            <span className="inline-flex items-center gap-1.5 text-[13px] text-[#E8CC8C]">
                                <Check size={14} strokeWidth={2.5} aria-hidden /> {t('progress.recap_golden')}
                            </span>
                        )}
                    </div>
                </div>

                {lines.length > 0 && (
                    <ul className="flex flex-col gap-3" data-recap-lines>
                        {lines.map((line, i) => (
                            <li key={i} className="flex items-start gap-3 text-[14.5px] leading-snug">
                                <span className="mt-0.5 shrink-0 text-[#A9DE9F]" aria-hidden>{line.icon}</span>
                                <span className="text-stone-200">
                                    {line.text}
                                    {line.names && line.names.length > 0 && (
                                        <span className="flex flex-wrap gap-x-2 gap-y-1 text-[13.5px] text-stone-400">
                                            {line.names.map((name, j) => (
                                                <button
                                                    key={j}
                                                    type="button"
                                                    onClick={name.onOpen}
                                                    data-recap-link
                                                    className="rounded text-left underline decoration-stone-600 underline-offset-4 transition-colors hover:text-[#F5F4EE] hover:decoration-stone-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86BE7F] cursor-pointer"
                                                >
                                                    {name.label}
                                                </button>
                                            ))}
                                        </span>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
                {evidence === null && lines.length === 0 && (
                    <p className="text-[13.5px] text-stone-500">{t('progress.recap_loading')}</p>
                )}
                {quiet && <p className="text-[14px] text-stone-400">{t('progress.recap_quiet')}</p>}

                <div className="flex justify-end">
                    <button type="button" onClick={onClose} className={btn.primary('md')}>
                        {t('progress.recap_close')}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
