import Link from 'next/link';
import type { Metadata } from 'next';
import { resolveServerLocale } from '@/lib/server-locale';
import { getServerT } from '@/lib/i18n-content';
import { getCopyOverrides } from '@/lib/siteCopy';
import { localizePath } from '@/lib/i18n';
import SiteFooterStrip from '@/components/SiteFooterStrip';
import CookiePreferences from '@/components/CookiePreferences';
import { getPublishedPage, renderPageBody, renderMarkdownBody } from '@/lib/sitePages';
import { pickLocale } from '@/lib/content';
import { COOKIES_FALLBACK_MD } from '@/lib/cookiePageBody';

/**
 * Cookie settings — the words from the CMS, the switches from the code.
 *
 * Same shape as /privacy and /terms: a published `site_pages/cookies` document
 * wins so an editor can change the explanation without a deploy, and the copy
 * below is the fallback that guarantees the page never 404s.
 *
 * The panel is the one thing an editor cannot move or delete. It is not text:
 * the categories it shows are the categories lib/cookieConsent.ts enforces, and
 * a page that described cookies nobody could switch — or offered switches for
 * cookies we don't set — would be the exact failure a settings page exists to
 * prevent. So the body is theirs and the control is ours, the same division
 * that keeps CookieSettingsButton outside the privacy policy's CMS body.
 */

export async function generateMetadata(): Promise<Metadata> {
    const { language } = await resolveServerLocale();
    const t = getServerT(language, await getCopyOverrides());

    const cmsPage = await getPublishedPage('cookies');
    if (cmsPage) {
        return {
            title: `${pickLocale(cmsPage.title, language)} | Veinote`,
            description: pickLocale(cmsPage.description, language),
        };
    }

    return {
        title: `${t('cookies.page_title')} | Veinote`,
        description: t('cookies.page_intro'),
    };
}

export default async function CookiesPage() {
    const { language } = await resolveServerLocale();
    const t = getServerT(language, await getCopyOverrides());
    const cmsPage = await getPublishedPage('cookies');

    const title = cmsPage ? pickLocale(cmsPage.title, language) : t('cookies.page_title');
    const intro = cmsPage ? pickLocale(cmsPage.description, language) : t('cookies.page_intro');
    const bodyHtml = cmsPage ? renderPageBody(cmsPage, language) : renderMarkdownBody(COOKIES_FALLBACK_MD);

    return (
        <div className="overflow-x-clip bg-[#E6E3DB] min-h-screen font-sans">
            <section className="pt-40 md:pt-48 pb-24 px-6 md:px-[10%]">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-sans text-stone-900 leading-[1.05] tracking-tight mb-4">
                        {title}
                    </h1>
                    {intro && <p className="text-base text-stone-600 leading-relaxed mb-10">{intro}</p>}

                    {/* The panel sits on white rather than on the page's own
                        stone: it is the one thing here to act on, and the switches
                        borrow their off-state from the platform's stone-200 track,
                        which disappears against #E6E3DB.

                        Above the prose, not below it — the answer is what someone
                        came for, and the explanation is what they read if the
                        answer isn't obvious. */}
                    <div className="bg-white rounded-[22px] border border-stone-200 shadow-sm px-6 py-2 md:px-8">
                        <CookiePreferences className="pb-6" />
                    </div>

                    <div
                        className="site-page-body flex flex-col gap-4 mt-12"
                        dangerouslySetInnerHTML={{ __html: bodyHtml }}
                    />

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
