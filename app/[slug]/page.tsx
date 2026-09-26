import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { resolveServerLocale } from "@/lib/server-locale";
import { getChildPages, getPublishedPage, renderPageBody } from "@/lib/sitePages";
import { pageKind, pickLocale, type Locale, type SitePage } from "@/lib/content";
import { SITE_URL, localizePath } from "@/lib/i18n";
import SiteFooterStrip from "@/components/SiteFooterStrip";

/**
 * Renders a CMS-managed website page at /{slug} (and /no/{slug}, /sv/{slug}).
 *
 * This is a catch-all for single-segment paths, so it only ever runs for URLs
 * that don't match a real route — Next resolves static segments like /about and
 * /privacy first. Anything with no matching published page 404s.
 */

type Props = { params: Promise<{ slug: string }> };

const OG_LOCALES = { en: "en_US", no: "nb_NO", sv: "sv_SE" } as const;
const DEFAULT_OG_IMAGE = "/assets/og-veinote.png";
const ORGANIZATION = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "Veinote",
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/assets/brand/veinote-wordmark-ink.png` },
};

/**
 * Bylines that belong to a person on the team, with what search engines and AI
 * answers should know about them. A byline naming anyone else becomes a bare
 * Person; "Veinote" (or no byline) is the organization itself.
 */
const TEAM_AUTHORS: Record<string, { jobTitle: string }> = {
    "Peter Nordberg": { jobTitle: "Co-founder, singer-songwriter and producer" },
};

function authorEntity(author: string | null | undefined) {
    const name = author?.trim();
    if (!name || name.toLowerCase() === "veinote") return ORGANIZATION;
    const team = TEAM_AUTHORS[name];
    return team
        ? { "@type": "Person", name, jobTitle: team.jobTitle, worksFor: { "@id": ORGANIZATION["@id"] } }
        : { "@type": "Person", name };
}

function absolute(url: string): string {
    return /^https?:\/\//i.test(url) ? url : `${SITE_URL}${url}`;
}

/** Structured data for a blog post: who wrote it, when, and for whom. */
function postJsonLd(page: SitePage, language: Locale, url: string, title: string, description: string) {
    const modified = page.updatedAt ? new Date(page.updatedAt).toISOString() : page.publishedAt;
    return {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: title,
        description: description || undefined,
        inLanguage: language === "no" ? "nb" : language,
        url,
        mainEntityOfPage: url,
        image: absolute(page.coverUrl || DEFAULT_OG_IMAGE),
        datePublished: page.publishedAt || undefined,
        dateModified: modified || undefined,
        author: authorEntity(page.author),
        publisher: ORGANIZATION,
    };
}

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
    const isPost = pageKind(page.kind) === "blog";
    const url = SITE_URL + localizePath(`/${slug}`, language);
    const image = page.coverUrl || DEFAULT_OG_IMAGE;

    // No `alternates` here on purpose: the root layout already emits a
    // self-referencing canonical plus hreflang for every locale, and a page-level
    // `alternates` replaces it rather than merging. The one this page used to set
    // pointed /no and /sv at the English URL, which tells Google the Nordic
    // versions are duplicates and keeps them out of the index.
    //
    // `openGraph` does need restating in full, for the same replace-not-merge
    // reason: without it a shared post previews as the homepage.
    return {
        title: `${title} | Veinote`,
        description,
        ...(isPost && page.author ? { authors: [{ name: page.author }] } : {}),
        openGraph: {
            type: isPost ? "article" : "website",
            siteName: "Veinote",
            url,
            title,
            description,
            locale: OG_LOCALES[language],
            images: [
                page.coverUrl
                    ? { url: page.coverUrl, alt: title }
                    : { url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: title },
            ],
            ...(isPost
                ? {
                      publishedTime: page.publishedAt || undefined,
                      modifiedTime: page.updatedAt ? new Date(page.updatedAt).toISOString() : undefined,
                      authors: page.author ? [page.author] : undefined,
                  }
                : {}),
        },
        twitter: { card: "summary_large_image", title, description, images: [image] },
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
    const jsonLd = isPost
        ? postJsonLd(page, language, SITE_URL + localizePath(`/${slug}`, language), title, description)
        : null;

    return (
        // Background matches /about and /privacy so the standalone content pages
        // read as one family rather than three different sites.
        <div className="min-h-screen bg-[#E6E3DB] font-sans flex flex-col">
            {jsonLd && (
                <script
                    type="application/ld+json"
                    // CMS-authored text ends up in this string; escaping "<"
                    // keeps a crafted title from closing the script tag.
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
                />
            )}
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
