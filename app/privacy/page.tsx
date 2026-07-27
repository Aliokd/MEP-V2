import Link from 'next/link';
import type { Metadata } from 'next';
import { resolveServerLocale } from '@/lib/server-locale';
import { getServerT } from '@/lib/i18n-content';
import { localizePath } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
    const { language } = await resolveServerLocale();
    const t = getServerT(language);
    return {
        title: `${t('privacy.title')} — Veinote`,
        description: t('privacy.sections.introduction.body'),
    };
}

const SECTION_IDS = [
    'introduction',
    'info_we_collect',
    'how_we_use',
    'your_content',
    'cookies_analytics',
    'third_party',
    'data_security',
    'data_retention',
    'your_rights',
    'childrens_privacy',
    'changes',
    'contact',
] as const;

export default async function PrivacyPolicyPage() {
    const { language } = await resolveServerLocale();
    const t = getServerT(language);

    return (
        <div className="overflow-x-clip bg-[#E6E3DB] min-h-screen font-sans">
            <section className="pt-40 md:pt-48 pb-24 px-6 md:px-[10%]">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-sans text-stone-900 leading-[1.05] tracking-tight mb-4">
                        {t('privacy.title')}
                    </h1>
                    <p className="text-sm text-stone-500 font-medium mb-16">{t('privacy.effective_date')}</p>

                    <div className="flex flex-col">
                        {SECTION_IDS.map((id) => (
                            <div key={id} className="border-b border-stone-400/20 py-8">
                                <h2 className="text-lg font-semibold text-stone-900 mb-3">{t(`privacy.sections.${id}.title`)}</h2>
                                <p className="text-sm md:text-base text-stone-600 leading-relaxed whitespace-pre-line">
                                    {t(`privacy.sections.${id}.body`)}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="pt-10 flex items-center gap-6 text-[14px] text-[#363636]">
                        <Link href={localizePath('/about', language)} className="hover:text-black transition-colors font-medium">{t('common.about')}</Link>
                        <Link href={localizePath('/', language)} className="hover:text-black transition-colors font-medium">{t('common.home')}</Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
