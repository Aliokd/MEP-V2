"use client";
import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { safeLocalStorageSetItem } from '@/lib/storage';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { ProfileSong, SongTrack } from './components/SongCards';
import type { Language } from '@/context/LanguageContext';

/**
 * The user's own songs, shaped for the vinyl cards. Shared by the profile's
 * recent-songs shelf and the full My songs page. One-shot fetch — a live
 * listener buys nothing on these pages, and the Create canvas remains the
 * source of truth for editing.
 */
export function useMySongs(user: User | null, t: (key: string) => string) {
    const [songs, setSongs] = useState<ProfileSong[]>([]);
    const [songsLoaded, setSongsLoaded] = useState(false);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            try {
                const snap = await getDocs(
                    query(collection(db, 'projects'), where('ownerId', '==', user.uid))
                );
                let completedIds: string[] = [];
                try { completedIds = JSON.parse(localStorage.getItem('mep-completed-songs') || '[]'); } catch {}
                const list: ProfileSong[] = [];
                snap.forEach(d => {
                    const data = d.data();
                    const ts = Date.parse(String(data.updatedAt || ''));

                    // Project ids are minted as `n-<epoch ms>` in Create, which is the
                    // only record of when a song was started — the docs carry no
                    // createdAt field.
                    const idTs = /^n-\d+$/.test(d.id) ? parseInt(d.id.slice(2), 10) : NaN;

                    // Playable audio: the canvas's audio cards, plus the legacy
                    // top-level recording on audio-only notes.
                    const tracks: SongTrack[] = [];
                    if (data.audioUrl) {
                        tracks.push({
                            id: 'main',
                            url: data.audioUrl,
                            title: data.title || '',
                            duration: data.recordingDuration || 0,
                        });
                    }
                    (Array.isArray(data.audioNotes) ? data.audioNotes : []).forEach((a: any) => {
                        if (a?.url) {
                            tracks.push({
                                id: a.id || a.url,
                                url: a.url,
                                title: a.title || '',
                                duration: a.duration || 0,
                            });
                        }
                    });

                    list.push({
                        id: d.id,
                        title: data.title || t('workspace.untitled_note'),
                        updatedAt: isNaN(ts) ? 0 : ts,
                        createdAt: isNaN(idTs) ? 0 : idTs,
                        isCompleted: completedIds.includes(d.id),
                        collaborators: Array.isArray(data.collaborators) ? data.collaborators.length : 0,
                        tracks,
                        // Present only once the song has been published — that is when the
                        // split is actually agreed. Absent means "not agreed yet", which the
                        // card says outright rather than inventing an even division.
                        ownershipSplits: Array.isArray(data.ownershipSplits) ? data.ownershipSplits : undefined,
                        ownershipAgreedAt: typeof data.ownershipAgreedAt === 'number' ? data.ownershipAgreedAt : 0,
                    });
                });
                list.sort((a, b) => b.updatedAt - a.updatedAt);
                if (!cancelled) setSongs(list);
            } catch (error) {
                console.error('Error loading songs for profile:', error);
            } finally {
                if (!cancelled) setSongsLoaded(true);
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    return { songs, songsLoaded };
}

/**
 * Leaving a profile page always goes through the layout's slide-out (see
 * veinote-profile-exit in the platform layout) so every exit shares one motion.
 */
export function leaveProfileTo(to: string) {
    window.dispatchEvent(new CustomEvent('veinote-profile-exit', { detail: { to } }));
}

/** The Create canvas restores its selection from this key on mount. */
export function openSongInCreate(uid: string, songId: string) {
    safeLocalStorageSetItem(`veinote-selected-note-id-${uid}`, songId);
    leaveProfileTo('/platform/create');
}

export function formatSongDate(language: Language, ms: number): string {
    if (!ms) return '';
    const locale = language === 'no' ? 'nb-NO' : language === 'sv' ? 'sv-SE' : 'en-GB';
    return new Date(ms).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}
