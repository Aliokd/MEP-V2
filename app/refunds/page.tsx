import type { Metadata } from 'next';
import { resolveServerLocale } from '@/lib/server-locale';
import { getServerT } from '@/lib/i18n-content';
import { getCopyOverrides } from '@/lib/siteCopy';
import SiteFooterStrip from '@/components/SiteFooterStrip';
import { getPublishedPage, renderPageBody, renderMarkdownBody } from '@/lib/sitePages';
import { pickLocale } from '@/lib/content';
import { REFUNDS_FALLBACK_MD } from '@/lib/refundsPageBody';

/**
 * Refund policy.
 *
 * Same shape as /terms: a published `site_pages/refunds` CMS document wins so
 * the text can be edited without a deploy, and the copy in lib/refundsPageBody
 * is the fallback that guarantees the page never 404s. Paddle checks for this
 * page when approving the seller account and the checkout domain, which is
 * why it has its own route rather than living as a section of the terms.
 */

export async function generateMetadata(): Promise<Metadata> {
    const { language } = await resolveServerLocale();
    const t = getServerT(language, await getCopyOverrides());

    const cmsPage = await getPublishedPage('refunds');
    if (cmsPage) {
        return {
            title: `${pickLocale(cmsPage.title, language)} | Veinote`,
            description: pickLocale(cmsPage.description, language),
        };
    }

    return {
        title: `${t('refunds.title')} | Veinote`,
        description: t('refunds.effective_date'),
    };
}

export default async function RefundsPage() {
    const { language } = await resolveServerLocale();
    const t = getServerT(language, await getCopyOverrides());
    const cmsPage = await getPublishedPage('refunds');

    const title = cmsPage ? pickLocale(cmsPage.title, language) : t('refunds.title');
    const subtitle = cmsPage ? pickLocale(cmsPage.description, language) : t('refunds.effective_date');
    const bodyHtml = cmsPage ? renderPageBody(cmsPage, language) : renderMarkdownBody(REFUNDS_FALLBACK_MD);

    return (
        <div className="overflow-x-clip bg-[#E6E3DB] min-h-screen font-sans">
            <section className="pt-40 md:pt-48 pb-24 px-6 md:px-[10%]">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-sans text-stone-900 leading-[1.05] tracking-tight mb-4">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-sm text-stone-500 font-medium mb-16">{subtitle}</p>
                    )}

                    {/* Markdown rendered server-side with HTML disabled, the same
                        hardened pipeline as every CMS page. */}
                    <div
                        className="site-page-body flex flex-col gap-4"
                        dangerouslySetInnerHTML={{ __html: bodyHtml }}
                    />
                </div>
            </section>

            <SiteFooterStrip language={language} currentPath="/refunds" />
        </div>
    );
}
