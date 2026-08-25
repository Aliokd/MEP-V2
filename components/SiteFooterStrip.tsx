import Link from 'next/link';
import { Heart } from 'lucide-react';
import { getServerT } from '@/lib/i18n-content';
import { getCopyOverrides } from '@/lib/siteCopy';
import { getFooterPages } from '@/lib/sitePages';
import { pickLocale } from '@/lib/content';
import { localizePath, type Language } from '@/lib/i18n';

/**
 * The footer strip carried by the standalone content pages — /about, /privacy,
 * and every CMS page.
 *
 * It lived inline in /about and nowhere else, so a reader who followed the
 * "Terms of use" link landed on a page with no way back. Lifted into one
 * component so all of them agree, and so a page added to the footer in the admin
 * shows up on every one of them at once.
 *
 * A server component: it reads the CMS with the Admin SDK, which keeps the links
 * in the server-rendered HTML where a crawler can follow them.
 */
export default async function SiteFooterStrip({
    language,
    /** Path of the page rendering this, so it doesn't link to itself. */
    currentPath,
}: {
    language: Language;
    currentPath?: string;
}) {
    const t = getServerT(language, await getCopyOverrides());
    const cmsPages = await getFooterPages();

    const links: { href: string; label: string; path: string }[] = [
        { path: '/privacy', href: localizePath('/privacy', language), label: t('privacy.title') },
        { path: '/terms', href: localizePath('/terms', language), label: t('terms.title') },
        ...cmsPages.map((page) => ({
            path: `/${page.slug}`,
            href: localizePath(`/${page.slug}`, language),
            label: pickLocale(page.title, language),
        })),
        // Q&A is a section on the homepage rather than a page of its own, so it
        // is an anchor link wherever it appears.
        { path: '#qa', href: `${localizePath('/', language)}#qa`, label: t('home.nav.qa') },
        { path: '/', href: localizePath('/', language), label: t('common.home') },
    ].filter((link) => link.path !== currentPath);

    return (
        <section className="px-6 md:px-[10%] pb-16 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-stone-400/20 pt-10">
            <div className="flex items-center gap-2 text-[14px] text-[#363636] font-medium bg-white/30 backdrop-blur-lg border border-white/40 px-5 py-2.5 rounded-full">
                <Heart className="w-4 h-4 fill-[#363636] stroke-none shrink-0" />
                <span>{t('home.footer.designed')}</span>
            </div>
            <div className="flex items-center gap-6 text-[14px] text-[#363636] flex-wrap justify-center">
                {links.map((link) => (
                    <Link
                        key={link.path}
                        href={link.href}
                        className="hover:text-black transition-colors font-medium"
                    >
                        {link.label}
                    </Link>
                ))}
            </div>
        </section>
    );
}
