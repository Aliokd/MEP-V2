import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import { resolveServerLocale } from '@/lib/server-locale';
import { getServerT } from '@/lib/i18n-content';
import { getCopyOverrides } from '@/lib/siteCopy';
import { waitlistJoinPath } from '@/lib/uiFlags';
import SiteFooterStrip from '@/components/SiteFooterStrip';

export async function generateMetadata(): Promise<Metadata> {
    const { language } = await resolveServerLocale();
    const t = getServerT(language, await getCopyOverrides());
    return {
        title: `${t('about.eyebrow')} | Veinote`,
        description: t('about.intro'),
    };
}

const PILLAR_IDS = ['learn', 'create', 'practice', 'connect'] as const;

export default async function AboutPage() {
    const { language } = await resolveServerLocale();
    const t = getServerT(language, await getCopyOverrides());

    return (
        <div className="overflow-x-clip bg-[#E6E3DB] min-h-screen font-sans">
            {/* Hero */}
            <section className="pt-40 md:pt-48 pb-20 px-6 md:px-[10%]">
                <div className="max-w-3xl">
                    <span className="text-stone-500 text-xs tracking-[0.2em] uppercase font-semibold">{t('about.eyebrow')}</span>
                    <h1 className="mt-4 text-5xl md:text-7xl font-sans text-stone-900 leading-[1.05] tracking-tight">
                        {t('about.title_1')} <span className="font-bold">{t('about.title_2')}</span>
                    </h1>
                    <p className="mt-8 text-base md:text-lg text-stone-600 leading-relaxed max-w-2xl">
                        {t('about.intro')}
                    </p>
                    <Link
                        href={waitlistJoinPath('about', language)}
                        className="btn-press mt-10 px-8 py-4 text-lg font-semibold inline-flex items-center gap-3 select-none"
                    >
                        <span>{t('home.nav.waitlist')}</span>
                        <ArrowRight className="w-5 h-5 stroke-[2.5px]" />
                    </Link>
                </div>
            </section>

            {/* Story */}
            <section className="px-6 md:px-[10%] pb-24 md:pb-32">
                <div className="max-w-2xl border-t border-stone-400/20 pt-16">
                    <h2 className="text-3xl md:text-4xl font-sans text-stone-900 tracking-tight mb-6">{t('about.story_title')}</h2>
                    <div className="space-y-5 text-stone-600 leading-relaxed">
                        <p>{t('about.story_p1')}</p>
                        <p>{t('about.story_p2')}</p>
                        <p>{t('about.story_p3')}</p>
                    </div>
                </div>
            </section>

            {/* Pillars */}
            <section className="px-6 md:px-[10%] pb-24 md:pb-32 border-t border-stone-400/20 pt-16">
                <h2 className="text-3xl md:text-4xl font-sans text-stone-900 tracking-tight mb-10">{t('about.pillars_title')}</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {PILLAR_IDS.map((id) => (
                        <div
                            key={id}
                            className="bg-white/40 border border-stone-300/40 rounded-[20px] p-6 flex flex-col gap-2"
                        >
                            <h3 className="text-lg font-semibold text-stone-900">{t(`navigation.${id}`)}</h3>
                            <p className="text-sm text-stone-600 leading-relaxed">{t(`about.pillars.${id}`)}</p>
                        </div>
                    ))}
                </div>
            </section>

            <SiteFooterStrip language={language} currentPath="/about" />
        </div>
    );
}
