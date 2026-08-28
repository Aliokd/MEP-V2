import Link from "next/link";
import type { Metadata } from "next";
import { resolveServerLocale } from "@/lib/server-locale";
import { getServerT } from "@/lib/i18n-content";
import { getCopyOverrides } from "@/lib/siteCopy";
import { listPublishedPosts } from "@/lib/sitePages";
import { pickLocale, type Locale } from "@/lib/content";
import { localizePath, SITE_URL } from "@/lib/i18n";
import SiteFooterStrip from "@/components/SiteFooterStrip";

/**
 * The blog index.
 *
 * Posts are ordinary CMS pages carrying `kind: "blog"`, so they keep living at
 * /{slug} — this is a way in, not a new home for them. Nothing here is authored
 * in code: publishing a post in the console puts it on this page, and no deploy
 * is involved.
 */

/** The date as a reader of that language would write it. */
function formatDate(iso: string | null | undefined, locale: Locale): string {
    if (!iso) return "";
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return "";
    const tag = locale === "no" ? "nb-NO" : locale === "sv" ? "sv-SE" : "en-GB";
    return new Intl.DateTimeFormat(tag, { day: "numeric", month: "long", year: "numeric" }).format(new Date(ms));
}

export async function generateMetadata(): Promise<Metadata> {
    const { language } = await resolveServerLocale();
    const t = getServerT(language, await getCopyOverrides());

    return {
        title: `${t("blog.title")} | Veinote`,
        description: t("blog.description"),
        alternates: {
            canonical: `${SITE_URL}${localizePath("/blog", language)}`,
            languages: { en: "/blog", no: "/no/blog", sv: "/sv/blog" },
        },
    };
}

export default async function BlogIndex() {
    const { language } = await resolveServerLocale();
    const t = getServerT(language, await getCopyOverrides());
    const posts = await listPublishedPosts();

    return (
        <div className="overflow-x-clip bg-[#E6E3DB] min-h-screen font-sans">
            <section className="pt-40 md:pt-48 pb-24 px-6 md:px-[10%]">
                <div className="max-w-3xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-sans text-stone-900 leading-[1.05] tracking-tight mb-4">
                        {t("blog.title")}
                    </h1>
                    <p className="text-base text-stone-600 mb-16 max-w-xl">{t("blog.description")}</p>

                    {posts.length === 0 ? (
                        <p className="text-sm text-stone-500">{t("blog.empty")}</p>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {posts.map((post) => {
                                const title = pickLocale(post.title, language);
                                const excerpt = pickLocale(post.description, language);
                                const date = formatDate(post.publishedAt, language);

                                return (
                                    <Link
                                        key={post.id}
                                        href={localizePath(`/${post.slug}`, language)}
                                        className="group flex gap-5 rounded-[20px] border border-stone-300/70 bg-[#FAF9F5] p-5 md:p-6 hover:border-stone-400 transition-colors"
                                    >
                                        {post.coverUrl && (
                                            // eslint-disable-next-line @next/next/no-img-element -- Cloud Storage URL, no allowlisted host.
                                            <img
                                                src={post.coverUrl}
                                                alt=""
                                                loading="lazy"
                                                className="hidden sm:block w-40 h-28 shrink-0 rounded-[14px] object-cover border border-stone-200"
                                            />
                                        )}

                                        <div className="flex flex-col gap-2 min-w-0">
                                            <h2 className="text-xl md:text-2xl font-sans text-stone-900 leading-snug group-hover:opacity-80 transition-opacity">
                                                {title}
                                            </h2>
                                            {excerpt && (
                                                <p className="text-sm text-stone-600 leading-relaxed line-clamp-3">{excerpt}</p>
                                            )}
                                            {(date || post.author) && (
                                                <span className="text-xs text-stone-500 mt-1">
                                                    {[post.author, date].filter(Boolean).join(" · ")}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            <SiteFooterStrip language={language} currentPath="/blog" />
        </div>
    );
}
