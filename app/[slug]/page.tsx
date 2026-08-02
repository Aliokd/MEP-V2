import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { resolveServerLocale } from "@/lib/server-locale";
import { getChildPages, getPublishedPage, renderPageBody } from "@/lib/sitePages";
import { pickLocale } from "@/lib/content";
import { localizePath } from "@/lib/i18n";

/**
 * Renders a CMS-managed website page at /{slug} (and /no/{slug}, /sv/{slug}).
 *
 * This is a catch-all for single-segment paths, so it only ever runs for URLs
 * that don't match a real route — Next resolves static segments like /about and
 * /privacy first. Anything with no matching published page 404s.
 */

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const [page, { language }] = await Promise.all([getPublishedPage(slug), resolveServerLocale()]);

    if (!page) return { title: "Not found — Veinote" };

    const title = pickLocale(page.title, language);
    const description = pickLocale(page.description, language);

    return {
        title: `${title} — Veinote`,
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

    return (
        <div className="min-h-screen bg-[#FAF9F5] pt-32 pb-24 px-6 md:px-[10%]">
            <article className="max-w-3xl mx-auto flex flex-col gap-6">
                <header className="flex flex-col gap-3">
                    <h1 className="text-4xl md:text-5xl font-sans font-light text-stone-800 tracking-tight">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-lg text-stone-500 font-light leading-relaxed">{description}</p>
                    )}
                </header>

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

                {page.updatedAt && (
                    <p className="text-xs text-stone-400 mt-6">
                        Last updated {new Date(page.updatedAt).toLocaleDateString()}
                    </p>
                )}
            </article>
        </div>
    );
}
