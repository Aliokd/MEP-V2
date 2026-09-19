import type { Metadata } from 'next';
import Link from 'next/link';
import { resolveServerLocale } from '@/lib/server-locale';
import { getServerT } from '@/lib/i18n-content';
import { getCopyOverrides } from '@/lib/siteCopy';

/**
 * Where an account lands after deleting itself. Plain and short: the account
 * is gone, nothing more is charged, and the way back in is a signup like any
 * other. Not indexed; nobody arrives here from a search.
 */
export async function generateMetadata(): Promise<Metadata> {
    const { language } = await resolveServerLocale();
    const t = getServerT(language, await getCopyOverrides());
    return {
        title: `${t('goodbye.title')} | Veinote`,
        robots: { index: false, follow: false },
    };
}

export default async function GoodbyePage() {
    const { language } = await resolveServerLocale();
    const t = getServerT(language, await getCopyOverrides());

    return (
        <div className="overflow-x-clip bg-[#E6E3DB] min-h-screen font-sans">
            <section className="pt-40 md:pt-48 pb-24 px-6 md:px-[10%]">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-sans text-stone-900 leading-[1.05] tracking-tight mb-6">
                        {t('goodbye.title')}
                    </h1>
                    <p className="text-lg text-stone-700 leading-relaxed max-w-xl mb-10">{t('goodbye.body')}</p>
                    <Link
                        href="/"
                        className="inline-flex items-center rounded-full bg-stone-900 px-6 py-3 text-[15px] font-semibold text-[#DCDDD4] hover:bg-stone-800 transition-colors"
                    >
                        {t('goodbye.home')}
                    </Link>
                </div>
            </section>
        </div>
    );
}
