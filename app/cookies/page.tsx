import Link from 'next/link';
import type { Metadata } from 'next';
import { resolveServerLocale } from '@/lib/server-locale';
import { getServerT } from '@/lib/i18n-content';
import { getCopyOverrides } from '@/lib/siteCopy';
import { localizePath } from '@/lib/i18n';
import SiteFooterStrip from '@/components/SiteFooterStrip';
import CookiePreferences from '@/components/CookiePreferences';

/**
 * The cookie settings, as a page of their own.
 *
 * An app route rather than a CMS page, unlike /terms: the words here are the
 * frame around a control, and a control is not something an editor can publish.
 * The categories it lists are the categories lib/cookieConsent.ts enforces, so
 * the two have to move together or the page starts describing cookies that
 * aren't set — which is the failure mode a settings page exists to prevent.
 *
 * Linked from the footer of every content page, which is where the copy tells
 * people to look for it.
 */

export async function generateMetadata(): Promise<Metadata> {
    const { language } = await resolveServerLocale();
    const t = getServerT(language, await getCopyOverrides());
    return {
        title: `${t('cookies.page_title')} | Veinote`,
        description: t('cookies.page_intro'),
    };
}

export default async function CookiesPage() {
    const { language } = await resolveServerLocale();
    const t = getServerT(language, await getCopyOverrides());

    return (
        <div className="overflow-x-clip bg-[#E6E3DB] min-h-screen font-sans">
            <section className="pt-40 md:pt-48 pb-24 px-6 md:px-[10%]">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-sans text-stone-900 leading-[1.05] tracking-tight mb-4">
                        {t('cookies.page_title')}
                    </h1>
                    <p className="text-base text-stone-600 leading-relaxed mb-10">{t('cookies.page_intro')}</p>

                    {/* The panel sits on white rather than on the page's own
                        stone: it is the one thing here to act on, and the switches
                        borrow their off-state from the platform's stone-200 track,
                        which disappears against #E6E3DB. */}
                    <div className="bg-white rounded-[22px] border border-stone-200 shadow-sm px-6 py-2 md:px-8">
                        <CookiePreferences className="pb-6" />
                    </div>

                    <p className="mt-8 text-sm text-stone-500 leading-relaxed">
                        {t('cookies.page_footnote')}{' '}
                        <Link
                            href={localizePath('/privacy', language)}
                            className="text-stone-700 underline underline-offset-2 hover:text-stone-900 transition-colors"
                        >
                            {t('privacy.title')}
                        </Link>
                        .
                    </p>
                </div>
            </section>

            <SiteFooterStrip language={language} currentPath="/cookies" />
        </div>
    );
}
