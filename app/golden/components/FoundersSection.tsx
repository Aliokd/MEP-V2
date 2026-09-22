import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { listPublishedPosts } from '@/lib/sitePages';
import { pickLocale } from '@/lib/content';
import { GOLDEN } from '../content';

/**
 * The founders, in their own words.
 *
 * Each card is a published blog post, linked to the post itself. The posts are
 * looked up by author rather than pinned by slug, so the section follows the
 * CMS: rewrite a post, publish a newer one, change its title, and this keeps
 * up. Pinning slugs here would mean a card on a hand-sent invitation page
 * quietly pointing at a 404 the first time a post was renamed.
 *
 * A founder with nothing published yet still gets a card, but a quiet one that
 * says so and is not a link: two founders, one still to write, rather than a
 * section that looks half built. It is deliberately not an anchor — a card that
 * looks pressable and goes nowhere is worse than one that plainly waits.
 */

/** The most recent published post by this author, if there is one. */
function latestBy(posts: Awaited<ReturnType<typeof listPublishedPosts>>, author: string) {
    const wanted = author.trim().toLowerCase();
    // `listPublishedPosts` is already newest first, so the first match wins.
    return posts.find((post) => (post.author ?? '').trim().toLowerCase().includes(wanted)) ?? null;
}

export default async function FoundersSection() {
    let posts: Awaited<ReturnType<typeof listPublishedPosts>> = [];
    try {
        posts = await listPublishedPosts();
    } catch {
        // The CMS being unreachable should cost this section, not the page.
        return null;
    }

    const cards = GOLDEN.founders.map((founder) => ({ founder, post: latestBy(posts, founder.match) }));

    return (
        <section className="px-6 md:px-[10%] pb-16 md:pb-24">
            <div className="border-t border-stone-400/20 pt-14">
                <h2 className="text-2xl md:text-3xl tracking-tight">{GOLDEN.foundersTitle}</h2>

                <div className="mt-8 grid items-stretch gap-4 md:gap-5 sm:grid-cols-2">
                    {cards.map(({ founder, post }) => {
                        // The cover is the only part that differs in height, so
                        // both cards reserve the same band whether or not there
                        // is a picture in it, and the pair sits level.
                        const cover = post?.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- Cloud Storage URL, no allowlisted host.
                            <img
                                src={post.coverUrl}
                                alt=""
                                loading="lazy"
                                className="h-48 w-full border-b border-stone-200/70 object-cover md:h-56"
                            />
                        ) : (
                            <div className="flex h-48 w-full items-center justify-center border-b border-stone-200/70 bg-[#E6E3DB]/60 md:h-56">
                                <span className="text-[13px] font-medium text-stone-500">{GOLDEN.foundersSoon}</span>
                            </div>
                        );

                        const body = (
                            <>
                                {cover}
                                <div className="flex grow flex-col p-6 md:p-7">
                                    <p className="text-[13px] font-medium text-[#C5A059]">{founder.role}</p>
                                    <h3 className="mt-2 text-xl leading-snug tracking-tight text-stone-900 md:text-[22px]">
                                        {post ? pickLocale(post.title, 'en') : founder.soonTitle}
                                    </h3>
                                    {post && pickLocale(post.description, 'en') ? (
                                        <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-stone-600">
                                            {pickLocale(post.description, 'en')}
                                        </p>
                                    ) : null}
                                    <span
                                        className={`mt-5 inline-flex items-center gap-1.5 text-sm font-medium ${
                                            post ? 'text-stone-800' : 'text-stone-500'
                                        }`}
                                    >
                                        {post ? GOLDEN.foundersRead : GOLDEN.foundersSoon}
                                        {post ? <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /> : null}
                                    </span>
                                </div>
                            </>
                        );

                        const shell = 'group flex flex-col overflow-hidden rounded-[28px] border border-stone-300/50 bg-white/45';

                        // Only a published post is a link. The other is a plain
                        // div: no href, no hover, nothing to press.
                        return post ? (
                            <Link
                                key={founder.match}
                                href={`/${post.slug}`}
                                className={`${shell} transition-colors hover:border-stone-400`}
                            >
                                {body}
                            </Link>
                        ) : (
                            <div key={founder.match} className={shell}>
                                {body}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
