"use client";
import { useEffect, useRef, useState } from 'react';
import {
    Play, Pause, SkipBack, SkipForward, CalendarDays, Clock3,
    UsersRound, CheckCircle2, PenLine, MicOff, Music, X, FileText, Percent
} from 'lucide-react';
import { setPlaybackAudioSession } from '@/lib/audioSession';
import * as btn from '@/app/platform/components/buttonStyles';

export interface SongTrack {
    id: string;
    url: string;
    title: string;
    duration: number; // seconds, 0 when unknown
}

/** One party's share, as agreed in the publish dialog. */
export interface SongOwnershipSplit {
    uid: string | null;
    name: string;
    percent: number;
    lyricsPercent: number;
    soundPercent: number;
}

export interface ProfileSong {
    id: string;
    title: string;
    updatedAt: number;  // epoch ms, 0 when unknown
    createdAt: number;  // epoch ms, 0 when unknown
    isCompleted: boolean;
    collaborators: number;
    tracks: SongTrack[];
    /** Set once the song has been published; absent while the split is unagreed. */
    ownershipSplits?: SongOwnershipSplit[];
    ownershipAgreedAt?: number;
}

interface SongCardsProps {
    songs: ProfileSong[];
    t: (key: string) => string;
    formatDate: (ms: number) => string;
    /** Routes through the layout's profile slide-out. */
    onOpenInCreate: (songId: string) => void;
    /** Grid column classes — the full My songs page spreads wider than the profile shelf. */
    gridClassName?: string;
    /** Whose songs these are — printed on the document as the creator. */
    ownerName?: string;
}

/**
 * Opens the song's details as a printable page, which the browser's print dialog
 * saves as a PDF.
 *
 * Built as a document rather than a download because that is what it is: a split
 * sheet — the record of who wrote a song and in what proportion, the thing a
 * publisher or collecting society asks for. Printing it is the browser's own
 * PDF writer, so nothing has to be uploaded and no PDF library ships to every
 * visitor for a page most will never open.
 *
 * Escaped on the way in: titles and names are user-typed, and this HTML is
 * assembled by hand.
 */
function openSongDocument(song: ProfileSong, ownerName: string, t: (k: string) => string, formatDate: (ms: number) => string) {
    const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
    ));
    const splits = song.ownershipSplits || [];
    const pct = (n: number) => `${Math.round(n)}%`;

    const rows = splits.length > 0
        ? splits.map(sp => `
            <tr>
                <td>${esc(sp.name || t('collab.owner'))}</td>
                <td class="num">${pct(sp.lyricsPercent)}</td>
                <td class="num">${pct(sp.soundPercent)}</td>
                <td class="num total">${pct(sp.percent)}</td>
            </tr>`).join('')
        : `<tr><td colspan="4" class="empty">${esc(t('profile.song_ownership_unagreed'))}</td></tr>`;

    const meta = [
        [t('profile.song_created'), song.createdAt > 0 ? formatDate(song.createdAt) : '–'],
        [t('profile.song_updated'), song.updatedAt > 0 ? formatDate(song.updatedAt) : '–'],
        [t('profile.song_recordings'), String(song.tracks.length)],
        [t('profile.song_collaborators'), String(song.collaborators)],
    ].map(([k, v]) => `<div class="meta-item"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');

    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(song.title)}</title>
<style>
  @page { margin: 22mm; }
  * { box-sizing: border-box; }
  body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1c1917; margin: 0; }
  /* On screen the page has no @page margin, so give it one — otherwise the
     document hugs the window edges while the print preview looks fine. */
  @media screen { body { padding: 48px 24px; } }
  .wrap { max-width: 700px; margin: 0 auto; }
  .brand { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #a8a29e; }
  h1 { font-size: 30px; line-height: 1.15; margin: 6px 0 2px; letter-spacing: -.02em; }
  .by { color: #57534e; font-size: 14px; margin-bottom: 26px; }
  h2 { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: #78716c;
       border-bottom: 1px solid #e7e5e4; padding-bottom: 6px; margin: 30px 0 12px; }
  dl.meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin: 0; }
  .meta-item { display: flex; justify-content: space-between; border-bottom: 1px dotted #e7e5e4; padding-bottom: 5px; }
  dt { color: #78716c; font-size: 13px; margin: 0; }
  dd { margin: 0; font-size: 13px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; color: #78716c; font-weight: 600; font-size: 11px;
       letter-spacing: .06em; text-transform: uppercase; padding: 0 0 8px; }
  th.num, td.num { text-align: right; }
  td { padding: 9px 0; border-top: 1px solid #f5f5f4; }
  td.total { font-weight: 700; }
  td.empty { color: #78716c; font-style: italic; padding: 14px 0; }
  .tracks li { font-size: 13px; padding: 7px 0; border-top: 1px solid #f5f5f4; list-style: none; }
  ul { margin: 0; padding: 0; }
  footer { margin-top: 34px; padding-top: 12px; border-top: 1px solid #e7e5e4;
           font-size: 11px; color: #a8a29e; display: flex; justify-content: space-between; }
</style></head>
<body><div class="wrap">
  <div class="brand">Veinote &middot; ${esc(t('profile.song_document_kind'))}</div>
  <h1>${esc(song.title)}</h1>
  <div class="by">${esc(t('profile.song_document_by'))} ${esc(ownerName)}</div>

  <h2>${esc(t('profile.song_document_details'))}</h2>
  <dl class="meta">${meta}</dl>

  <h2>${esc(t('profile.song_ownership'))}</h2>
  <table>
    <thead><tr>
      <th>${esc(t('profile.song_document_party'))}</th>
      <th class="num">${esc(t('publish.part_lyrics'))}</th>
      <th class="num">${esc(t('publish.part_sound'))}</th>
      <th class="num">${esc(t('profile.song_document_total'))}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  ${song.tracks.length > 0 ? `<h2>${esc(t('profile.song_recordings'))}</h2><ul class="tracks">${
      song.tracks.map(tr => `<li>${esc(tr.title || t('workspace.untitled_note'))}</li>`).join('')
  }</ul>` : ''}

  <footer>
    <span>${esc(t('profile.song_document_generated'))} ${esc(formatDate(Date.now()))}</span>
    <span>veinote.com</span>
  </footer>
</div>
<script>window.addEventListener('load', function () { window.print(); });</script>
</body></html>`;

    const win = window.open('', '_blank');
    if (!win) return false;      // popup blocked — the caller says so
    win.document.write(html);
    win.document.close();
    return true;
}

/* Centre-label colors, in the app's muted register. Keyed off the id so a song
   keeps its label across visits. */
const LABEL_COLORS = ['#5FA8B8', '#86BE7F', '#C5A059', '#B58599', '#8593B5'];
const labelColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
    return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
};

const formatClock = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function SongCards({ songs, t, formatDate, onOpenInCreate, gridClassName = 'grid-cols-2 sm:grid-cols-3', ownerName }: SongCardsProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    /** Set when the browser refused the document window, so the card can say why. */
    const [docBlockedFor, setDocBlockedFor] = useState<string | null>(null);
    const [trackIndex, setTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    // The audio element's listeners are attached once; these refs let them see
    // the current song/track without re-binding on every state change.
    const activeSongRef = useRef<ProfileSong | null>(null);
    const trackIndexRef = useRef(0);

    const activeSong = songs.find(s => s.id === activeId) || null;
    activeSongRef.current = activeSong;
    trackIndexRef.current = trackIndex;

    const getAudio = () => {
        if (!audioRef.current) {
            const audio = new Audio();
            audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
            audio.addEventListener('loadedmetadata', () => setDuration(audio.duration || 0));
            audio.addEventListener('ended', () => {
                const song = activeSongRef.current;
                const next = trackIndexRef.current + 1;
                if (song && next < song.tracks.length) {
                    playTrack(song, next);
                } else {
                    setIsPlaying(false);
                    setCurrentTime(0);
                }
            });
            audio.addEventListener('error', () => setIsPlaying(false));
            audioRef.current = audio;
        }
        return audioRef.current;
    };

    const playTrack = (song: ProfileSong, index: number) => {
        const track = song.tracks[index];
        if (!track) return;
        const audio = getAudio();
        audio.src = track.url;
        setTrackIndex(index);
        setCurrentTime(0);
        setDuration(track.duration || 0);
        // iOS: overrides the ring/silent switch, which otherwise plays this at zero volume.
        setPlaybackAudioSession();
        audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    };

    const stopPlayback = () => {
        const audio = audioRef.current;
        if (audio) {
            audio.pause();
            audio.removeAttribute('src');
        }
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
    };

    // Card click: open this song's player (and start it), or collapse it again.
    const handleSelect = (song: ProfileSong) => {
        if (activeId === song.id) {
            stopPlayback();
            setActiveId(null);
            return;
        }
        stopPlayback();
        setActiveId(song.id);
        setTrackIndex(0);
        if (song.tracks.length > 0) playTrack(song, 0);
    };

    const handleTogglePlay = () => {
        const song = activeSongRef.current;
        if (!song || song.tracks.length === 0) return;
        const audio = getAudio();
        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else if (audio.src) {
            setPlaybackAudioSession();
            audio.play().then(() => setIsPlaying(true)).catch(() => {});
        } else {
            playTrack(song, trackIndexRef.current);
        }
    };

    const handleStep = (delta: number) => {
        const song = activeSongRef.current;
        if (!song || song.tracks.length === 0) return;
        const count = song.tracks.length;
        playTrack(song, (trackIndexRef.current + delta + count) % count);
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current;
        if (!audio || !duration || !audio.src) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        audio.currentTime = ratio * duration;
        setCurrentTime(audio.currentTime);
    };

    // Silence the player when the section unmounts (leaving the profile).
    useEffect(() => () => {
        const audio = audioRef.current;
        if (audio) {
            audio.pause();
            audio.removeAttribute('src');
        }
    }, []);

    const currentTrack = activeSong?.tracks[trackIndex] || null;
    const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

    return (
        <div className={`grid gap-4 ${gridClassName}`}>
            {songs.map(song => {
                const isActive = song.id === activeId;

                if (!isActive) {
                    return (
                        <button
                            key={song.id}
                            onClick={() => handleSelect(song)}
                            className="group flex flex-col items-center gap-3 bg-white/60 hover:bg-white border border-stone-200/70 rounded-[20px] p-4 pt-6 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.07)] transition-all cursor-pointer active:scale-[0.98]"
                        >
                            <div
                                className="song-disc w-32 h-32 sm:w-24 sm:h-24 group-hover:scale-105 transition-transform duration-300"
                                style={{ '--song-label-color': labelColor(song.id) } as React.CSSProperties}
                            >
                                <div className="song-disc-label" />
                                <div className="song-disc-hole" />
                            </div>
                            <div className="text-center min-w-0 w-full">
                                <p className="text-[15px] sm:text-sm font-medium text-stone-800 truncate">{song.title}</p>
                                <p className="text-[12.5px] sm:text-[11px] text-stone-500 mt-0.5 flex items-center justify-center gap-1">
                                    {song.isCompleted && <CheckCircle2 size={12} className="text-[#3f6b3a] shrink-0" strokeWidth={2.2} />}
                                    {song.updatedAt > 0 ? formatDate(song.updatedAt) : ' '}
                                </p>
                            </div>
                        </button>
                    );
                }

                return (
                    <div
                        key={song.id}
                        className="col-span-full relative flex flex-col items-center gap-5 bg-white border border-stone-200/70 rounded-[24px] p-7 pt-9 shadow-[0_10px_30px_rgba(0,0,0,0.07)]"
                    >
                        <button
                            onClick={() => handleSelect(song)}
                            aria-label={t('common.close')}
                            className={`${btn.iconGhost('sm')} absolute top-3.5 right-3.5 cursor-pointer`}
                        >
                            <X size={16} strokeWidth={2.2} />
                        </button>

                        {/* Platter */}
                        <div
                            className="song-disc song-disc--spin w-40 h-40 sm:w-48 sm:h-48"
                            style={{
                                '--song-label-color': labelColor(song.id),
                                animationPlayState: isPlaying ? 'running' : 'paused',
                            } as React.CSSProperties}
                        >
                            <div className="song-disc-label" />
                            <div className="song-disc-hole" />
                        </div>

                        {/* Time + identity, like a record sleeve */}
                        <div className="text-center space-y-1">
                            <p className="text-lg text-stone-500 font-light tabular-nums tracking-wide">
                                {formatClock(currentTrack ? currentTime : 0)}
                            </p>
                            <p className="text-lg text-stone-900">
                                <span className="italic font-medium">{song.title}</span>
                                <span className="text-stone-500"> - {t('profile.song_by_you')}</span>
                            </p>
                            {currentTrack ? (
                                <p className="text-sm text-stone-500">
                                    {currentTrack.title || t('profile.song_recordings')}
                                    {song.tracks.length > 1 && (
                                        <span className="text-stone-400"> · {trackIndex + 1}/{song.tracks.length}</span>
                                    )}
                                </p>
                            ) : (
                                <p className="text-sm text-stone-400 flex items-center justify-center gap-1.5">
                                    <MicOff size={13} strokeWidth={2} />
                                    {t('profile.song_no_recording')}
                                </p>
                            )}
                        </div>

                        {/* Seek bar */}
                        {currentTrack && (
                            <div
                                onClick={handleSeek}
                                className="w-full max-w-xs h-4 flex items-center cursor-pointer group/seek"
                            >
                                <div className="w-full h-1 rounded-full bg-stone-200 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-stone-700 group-hover/seek:bg-stone-900 transition-colors"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Controls */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => handleStep(-1)}
                                disabled={song.tracks.length < 2}
                                aria-label={t('profile.song_previous')}
                                className={`${btn.icon('bare')} h-12 w-12 cursor-pointer disabled:opacity-40`}
                            >
                                <SkipBack size={17} strokeWidth={2} />
                            </button>
                            <button
                                onClick={handleTogglePlay}
                                disabled={song.tracks.length === 0}
                                aria-label={isPlaying ? t('profile.song_pause') : t('profile.song_play')}
                                className={`${btn.icon('bare')} h-16 w-16 cursor-pointer disabled:opacity-40`}
                            >
                                {isPlaying
                                    ? <Pause size={22} strokeWidth={2} />
                                    : <Play size={22} strokeWidth={2} className="ml-0.5" />}
                            </button>
                            <button
                                onClick={() => handleStep(1)}
                                disabled={song.tracks.length < 2}
                                aria-label={t('profile.song_next')}
                                className={`${btn.icon('bare')} h-12 w-12 cursor-pointer disabled:opacity-40`}
                            >
                                <SkipForward size={17} strokeWidth={2} />
                            </button>
                        </div>

                        {/* Details */}
                        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11.5px] text-stone-500 font-medium pt-1">
                            {song.createdAt > 0 && (
                                <span className="flex items-center gap-1.5">
                                    <CalendarDays size={13} strokeWidth={2} className="text-stone-400" />
                                    {t('profile.song_created')} {formatDate(song.createdAt)}
                                </span>
                            )}
                            {song.updatedAt > 0 && (
                                <span className="flex items-center gap-1.5">
                                    <Clock3 size={13} strokeWidth={2} className="text-stone-400" />
                                    {t('profile.song_updated')} {formatDate(song.updatedAt)}
                                </span>
                            )}
                            {song.tracks.length > 0 && (
                                <span className="flex items-center gap-1.5">
                                    <Music size={13} strokeWidth={2} className="text-stone-400" />
                                    {song.tracks.length} {t('profile.song_recordings').toLowerCase()}
                                </span>
                            )}
                            {song.collaborators > 0 && (
                                <span className="flex items-center gap-1.5">
                                    <UsersRound size={13} strokeWidth={2} className="text-stone-400" />
                                    {song.collaborators} {t('profile.song_collaborators').toLowerCase()}
                                </span>
                            )}
                            {song.isCompleted && (
                                <span className="flex items-center gap-1.5 text-[#3f6b3a]">
                                    <CheckCircle2 size={13} strokeWidth={2.2} />
                                    {t('profile.song_completed')}
                                </span>
                            )}
                        </div>

                        {/* Ownership, in one line. Named shares when they have been agreed;
                            otherwise it says so, rather than implying an even split nobody
                            actually signed off. */}
                        <div className="flex items-center justify-center gap-1.5 text-[11.5px] text-stone-500 font-medium">
                            <Percent size={12} strokeWidth={2} className="text-stone-400 shrink-0" />
                            {song.ownershipSplits && song.ownershipSplits.length > 0 ? (
                                <span className="truncate">
                                    {song.ownershipSplits
                                        .slice()
                                        .sort((a, b) => b.percent - a.percent)
                                        .map(sp => `${sp.name || t('collab.owner')} ${Math.round(sp.percent)}%`)
                                        .join(' · ')}
                                </span>
                            ) : (
                                <span className="italic text-stone-400">{t('profile.song_ownership_unagreed')}</span>
                            )}
                        </div>

                        <div className="flex items-center justify-center gap-2 flex-wrap">
                            <button
                                onClick={() => onOpenInCreate(song.id)}
                                className={`${btn.secondary('xs')} cursor-pointer`}
                            >
                                <PenLine size={13} strokeWidth={2} />
                                {t('profile.song_open_in_create')}
                            </button>
                            <button
                                onClick={() => {
                                    const opened = openSongDocument(song, ownerName || t('collab.me'), t, formatDate);
                                    if (!opened) setDocBlockedFor(song.id);
                                }}
                                className={`${btn.secondary('xs')} cursor-pointer`}
                            >
                                <FileText size={13} strokeWidth={2} />
                                {t('profile.song_document')}
                            </button>
                        </div>
                        {docBlockedFor === song.id && (
                            <p className="text-[11px] text-amber-700 text-center">
                                {t('profile.song_document_blocked')}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
