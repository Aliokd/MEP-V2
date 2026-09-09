import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';
import { resolveServerLocale } from '@/lib/server-locale';
import { getServerT } from '@/lib/i18n-content';
import PublicSongCard, { type PublicSong } from './PublicSongCard';

/**
 * The public page behind Share on a song card: a link anyone can open, with no
 * account and no sign-in.
 *
 * Read on the server with the Admin SDK rather than from the browser, because
 * `connect_posts` is deliberately signed-in-only in firestore.rules — the feed
 * was world-readable once and that allowed anyone to scrape every post. This
 * route opens exactly one post, by id, and sends only the four fields a reader
 * needs. The rule stays shut.
 */

type Props = { params: Promise<{ id: string }> };

/** How much of the lyric goes in the link preview. */
const PREVIEW_CHARS = 160;

async function loadSong(id: string): Promise<PublicSong | null> {
    try {
        const snap = await adminDb.collection('connect_posts').doc(id).get();
        if (!snap.exists) return null;
        const d = snap.data() || {};

        // A post the moderators pulled is not shareable. Hiding normally *moves*
        // the document to `moderated_posts`, so this is the belt to that braces:
        // an older post flagged in place must not become public by link.
        if (d.hidden === true) return null;

        // Connect attaches audio with URL.createObjectURL, which is a blob: URL
        // that only exists in the tab that made it. It cannot resolve for anyone
        // else, here or in the feed, so only a real http(s) address is passed on
        // and everything else renders as a lyrics-only page.
        const rawUrl: string = d.attachment?.url || '';
        const audioUrl = /^https?:\/\//i.test(rawUrl) || rawUrl.startsWith('/') ? rawUrl : null;

        return {
            id: snap.id,
            projectName: d.projectName || 'Untitled',
            author: d.author || '',
            lyrics: Array.isArray(d.lyrics) ? d.lyrics.filter((l: unknown) => typeof l === 'string') : [],
            audioUrl,
        };
    } catch (err) {
        console.error('[song] Could not load shared song:', err);
        return null;
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const [song, { language }] = await Promise.all([loadSong(id), resolveServerLocale()]);
    const t = getServerT(language);

    if (!song) {
        return { title: 'Not found | Veinote', robots: { index: false, follow: true } };
    }

    const title = song.author
        ? t('connect.share_meta_title').replace('{song}', song.projectName).replace('{author}', song.author)
        : song.projectName;
    const opening = song.lyrics.join(' / ').slice(0, PREVIEW_CHARS);
    const description = opening || t('connect.share_tagline');

    return {
        title,
        description,
        // Out of the index, like the shared streak card. The songwriter posted
        // to a feed only members can read; a link they can hand to someone is
        // what was asked for, not a page search engines crawl and keep. One
        // word here opens that up if it is ever wanted.
        robots: { index: false, follow: true },
        openGraph: { title, description, type: 'article' },
        twitter: { card: 'summary_large_image', title, description },
    };
}

export default async function SongPage({ params }: Props) {
    const { id } = await params;
    const song = await loadSong(id);
    if (!song) notFound();
    return <PublicSongCard song={song} />;
}
