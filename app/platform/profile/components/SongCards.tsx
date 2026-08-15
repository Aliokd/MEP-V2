"use client";
import { useEffect, useRef, useState } from 'react';
import {
    Play, Pause, SkipBack, SkipForward, CalendarDays, Clock3,
    UsersRound, CheckCircle2, PenLine, MicOff, Music, X
} from 'lucide-react';
import { setPlaybackAudioSession } from '@/lib/audioSession';

export interface SongTrack {
    id: string;
    url: string;
    title: string;
    duration: number; // seconds, 0 when unknown
}

export interface ProfileSong {
    id: string;
    title: string;
    updatedAt: number;  // epoch ms, 0 when unknown
    createdAt: number;  // epoch ms, 0 when unknown
    isCompleted: boolean;
    collaborators: number;
    tracks: SongTrack[];
}

interface SongCardsProps {
    songs: ProfileSong[];
    t: (key: string) => string;
    formatDate: (ms: number) => string;
    /** Routes through the layout's profile slide-out. */
    onOpenInCreate: (songId: string) => void;
    /** Grid column classes — the full My songs page spreads wider than the profile shelf. */
    gridClassName?: string;
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

export default function SongCards({ songs, t, formatDate, onOpenInCreate, gridClassName = 'grid-cols-2 sm:grid-cols-3' }: SongCardsProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
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
                            className="group flex flex-col items-center gap-3 bg-white/60 hover:bg-white border border-stone-200/70 rounded-[20px] p-5 pt-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.07)] transition-all cursor-pointer active:scale-[0.98]"
                        >
                            <div
                                className="song-disc w-24 h-24 group-hover:scale-105 transition-transform duration-300"
                                style={{ '--song-label-color': labelColor(song.id) } as React.CSSProperties}
                            >
                                <div className="song-disc-label" />
                                <div className="song-disc-hole" />
                            </div>
                            <div className="text-center min-w-0 w-full">
                                <p className="text-sm font-medium text-stone-800 truncate">{song.title}</p>
                                <p className="text-[11px] text-stone-500 mt-0.5 flex items-center justify-center gap-1">
                                    {song.isCompleted && <CheckCircle2 size={11} className="text-[#4e7a49] shrink-0" strokeWidth={2.2} />}
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
                            className="absolute top-3.5 right-3.5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-all cursor-pointer"
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
                                className="w-12 h-12 rounded-full bg-white border border-stone-200/80 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:border-stone-300 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-default disabled:active:scale-100"
                            >
                                <SkipBack size={17} strokeWidth={2} />
                            </button>
                            <button
                                onClick={handleTogglePlay}
                                disabled={song.tracks.length === 0}
                                aria-label={isPlaying ? t('profile.song_pause') : t('profile.song_play')}
                                className="w-16 h-16 rounded-full bg-white border border-stone-200/80 flex items-center justify-center text-stone-800 hover:text-stone-950 hover:border-stone-300 shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-default disabled:active:scale-100"
                            >
                                {isPlaying
                                    ? <Pause size={22} strokeWidth={2} />
                                    : <Play size={22} strokeWidth={2} className="ml-0.5" />}
                            </button>
                            <button
                                onClick={() => handleStep(1)}
                                disabled={song.tracks.length < 2}
                                aria-label={t('profile.song_next')}
                                className="w-12 h-12 rounded-full bg-white border border-stone-200/80 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:border-stone-300 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-default disabled:active:scale-100"
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
                                <span className="flex items-center gap-1.5 text-[#4e7a49]">
                                    <CheckCircle2 size={13} strokeWidth={2.2} />
                                    {t('profile.song_completed')}
                                </span>
                            )}
                        </div>

                        <button
                            onClick={() => onOpenInCreate(song.id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-stone-200/70 text-xs font-semibold text-stone-700 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] hover:text-stone-900 transition-all cursor-pointer active:scale-95"
                        >
                            <PenLine size={13} strokeWidth={2} />
                            {t('profile.song_open_in_create')}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
