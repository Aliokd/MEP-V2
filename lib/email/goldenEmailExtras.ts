import "server-only";
import { GOLDEN } from "@/app/golden/content";
import { listPublishedPosts } from "@/lib/sitePages";
import { pickLocale, type Locale } from "@/lib/content";
import { proYearlyPrice } from "@/lib/paddle/proYearlyPrice";
import type { GoldenEmailFounder, GoldenEmailPrice } from "@/lib/email/templates/goldenTicket";

/**
 * The two parts of the golden ticket email that the page reads live rather
 * than from its own copy: what a year of Pro costs today, and what the
 * founders last published. Fetched here, once per send, so the template stays
 * a plain function of its arguments and every sender (the claim, the console,
 * the template preview) gets the same page-shaped email.
 *
 * Both fail soft, like the page: the price falls back to config, and a CMS
 * that does not answer costs the email its founders section, not the send.
 */
export async function goldenEmailExtras(
    appUrl: string,
    locale: Locale = "en",
): Promise<{ price: GoldenEmailPrice; founders: GoldenEmailFounder[] }> {
    const [price, posts] = await Promise.all([
        proYearlyPrice(),
        listPublishedPosts().catch(() => null),
    ]);

    // The same lookup FoundersSection makes: each founder's newest post by
    // author name, newest first already, so the first match wins.
    const founders: GoldenEmailFounder[] = posts
        ? GOLDEN.founders.map((founder) => {
              const wanted = founder.match.trim().toLowerCase();
              const post = posts.find((p) => (p.author ?? "").trim().toLowerCase().includes(wanted)) ?? null;
              return {
                  role: founder.role,
                  title: post ? pickLocale(post.title, locale) : founder.soonTitle,
                  url: post ? `${appUrl}/${post.slug}` : null,
                  imageUrl: post?.coverUrl ?? null,
              };
          })
        : [];

    return { price: { amount: price.amount, currency: price.currency }, founders };
}
