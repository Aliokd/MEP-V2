import Link from 'next/link';
import { ArrowRight, Heart } from 'lucide-react';
import type { Metadata } from 'next';
import { resolveServerLocale } from '@/lib/server-locale';
import { getServerT } from '@/lib/i18n-content';
import { localizePath } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
    const { language } = await resolveServerLocale();
    const t = getServerT(language);
    return {
        title: `${t('about.eyebrow')} — Veinote`,
        description: t('about.intro'),
    };
}

const PILLAR_IDS = ['learn', 'create', 'practice', 'connect'] as const;

export default async function AboutPage() {
    const { language } = await resolveServerLocale();
    const t = getServerT(language);

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
                        href={localizePath('/onboarding', language)}
                        className="mt-10 bg-[#86BE7F] hover:opacity-90 text-stone-900 px-8 py-4 rounded-[20px] text-lg font-semibold transition-all inline-flex items-center gap-3 select-none"
                    >
                        <span>{t('home.nav.join')}</span>
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

            {/* Footer strip */}
            <section className="px-6 md:px-[10%] pb-16 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-stone-400/20 pt-10">
                <div className="flex items-center gap-2 text-[14px] text-[#363636] font-medium bg-white/30 backdrop-blur-lg border border-white/40 px-5 py-2.5 rounded-full">
                    <Heart className="w-4 h-4 fill-[#363636] stroke-none shrink-0" />
                    <span>{t('home.footer.designed')}</span>
                </div>
                <div className="flex items-center gap-6 text-[14px] text-[#363636]">
                    <Link href={localizePath('/privacy', language)} className="hover:text-black transition-colors font-medium">{t('privacy.title')}</Link>
                    <Link href={`${localizePath('/', language)}#qa`} className="hover:text-black transition-colors font-medium">{t('home.nav.qa')}</Link>
                    <Link href={localizePath('/', language)} className="hover:text-black transition-colors font-medium">{t('common.home')}</Link>
                </div>
            </section>
        </div>
    );
}
