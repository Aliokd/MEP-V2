import type { Metadata } from 'next';
import { resolveServerLocale } from '@/lib/server-locale';
import { getServerT } from '@/lib/i18n-content';
import StreakCard from './StreakCard';
import { parseStreakParams } from './params';

/**
 * The shared golden-mind card: the public page behind the Share option in the
 * weekly celebration. The numbers ride in the query string (see params.ts), so
 * the page needs no account and no database — a link someone can open from a
 * chat. Kept out of the index: it is a card, not a page of the site.
 */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
    const { language } = await resolveServerLocale();
    const t = getServerT(language);
    const { name } = parseStreakParams(await searchParams);
    const title = name ? t('streak_share.meta_title').replace('{name}', name) : t('streak_share.meta_title_noname');
    const description = t('streak_share.meta_description');
    return {
        title,
        description,
        robots: { index: false, follow: true },
        openGraph: {
            title,
            description,
            images: [{ url: '/assets/mind-power/brain-gold.webp', width: 1600, height: 1200 }],
        },
        twitter: { card: 'summary_large_image', title, description },
    };
}

export default async function StreakPage({ searchParams }: { searchParams: SearchParams }) {
    const params = parseStreakParams(await searchParams);
    return <StreakCard {...params} />;
}
