import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { resolveServerLocale } from "@/lib/server-locale";
import { getChildPages, getPublishedPage, renderPageBody } from "@/lib/sitePages";
import { pageKind, pickLocale, type Locale } from "@/lib/content";
import { localizePath } from "@/lib/i18n";
import SiteFooterStrip from "@/components/SiteFooterStrip";

/**
 * Renders a CMS-managed website page at /{slug} (and /no/{slug}, /sv/{slug}).
 *
 * This is a catch-all for single-segment paths, so it only ever runs for URLs
 * that don't match a real route — Next resolves static segments like /about and
 * /privacy first. Anything with no matching published page 404s.
 */

type Props = { params: Promise<{ slug: string }> };

/** The post's date, written the way a reader of that language would. */
function formatPostDate(iso: string | null | undefined, locale: Locale): string {
    if (!iso) return "";
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return "";
    const tag = locale === "no" ? "nb-NO" : locale === "sv" ? "sv-SE" : "en-GB";
    return new Intl.DateTimeFormat(tag, { day: "numeric", month: "long", year: "numeric" }).format(new Date(ms));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const [page, { language }] = await Promise.all([getPublishedPage(slug), resolveServerLocale()]);

    // The route answers 404 here, so keep the miss out of the index and out of
    // link previews rather than letting it inherit the site-level OG card.
    if (!page) return { title: "Not found | Veinote", robots: { index: false, follow: true } };

    const title = pickLocale(page.title, language);
    const description = pickLocale(page.description, language);

    return {
        title: `${title} | Veinote`,
        description,
        alternates: {
            canonical: `/${slug}`,
            languages: {
                en: `/${slug}`,
                no: `/no/${slug}`,
                sv: `/sv/${slug}`,
            },
        },
    };
}

export default async function SitePageRoute({ params }: Props) {
    const { slug } = await params;
    const [page, { language }] = await Promise.all([getPublishedPage(slug), resolveServerLocale()]);

    if (!page) notFound();

    const title = pickLocale(page.title, language);
    const description = pickLocale(page.description, language);
    const html = renderPageBody(page, language);
    const children = await getChildPages(page.slug);
    const isPost = pageKind(page.kind) === "blog";
    const postDate = isPost ? formatPostDate(page.publishedAt, language) : "";

    return (
        // Background matches /about and /privacy so the standalone content pages
        // read as one family rather than three different sites.
        <div className="min-h-screen bg-[#E6E3DB] font-sans flex flex-col">
            <article className="flex-1 max-w-3xl w-full mx-auto flex flex-col gap-6 pt-32 pb-20 px-6">
                <header className="flex flex-col gap-3">
                    {/* A post says where it belongs; a policy has nowhere to go back to. */}
                    {isPost && (
                        <Link
                            href={localizePath("/blog", language)}
                            className="self-start text-sm text-stone-500 hover:text-stone-800 transition-colors mb-2"
                        >
                            ← Blog
                        </Link>
                    )}

                    <h1 className="text-4xl md:text-5xl font-sans font-light text-stone-800 tracking-tight">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-lg text-stone-500 font-light leading-relaxed">{description}</p>
                    )}

                    {isPost && (page.author || postDate) && (
                        <span className="text-sm text-stone-500">
                            {[page.author, postDate].filter(Boolean).join(" · ")}
                        </span>
                    )}
                </header>

                {isPost && page.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- Cloud Storage URL, no allowlisted host.
                    <img
                        src={page.coverUrl}
                        alt=""
                        className="w-full rounded-[20px] border border-stone-200 object-cover"
                    />
                )}

                {/* Body is markdown rendered server-side with HTML disabled, so
                    there is no untrusted markup in this string. */}
                <div
                    className="site-page-body flex flex-col gap-4 text-stone-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: html }}
                />

                {children.length > 0 && (
                    <nav className="mt-8 pt-8 border-t border-stone-200 flex flex-col gap-2">
                        {children.map((child) => (
                            <Link
                                key={child.id}
                                href={localizePath(`/${child.slug}`, language)}
                                className="text-stone-700 hover:text-stone-900 underline underline-offset-4"
                            >
                                {pickLocale(child.title, language)}
                            </Link>
                        ))}
                    </nav>
                )}

                {/* A policy is judged by when it last changed; a post is dated
                    by its own line above, and a "last updated" stamp under it
                    would only confuse the two. */}
                {!isPost && page.updatedAt && (
                    <p className="text-xs text-stone-400 mt-6">
                        Last updated {new Date(page.updatedAt).toLocaleDateString()}
                    </p>
                )}
            </article>

            <SiteFooterStrip language={language} currentPath={`/${slug}`} />
        </div>
    );
}
