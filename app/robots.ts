import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/i18n';

/**
 * Crawler policy for the public site.
 *
 * The app surfaces (/platform, /admin) live behind auth and are useless in a
 * search index, so they're disallowed here and double-locked with an
 * X-Robots-Tag header in next.config.ts (a disallowed URL can still be indexed
 * bare if someone links to it — the header is what actually forbids indexing).
 *
 * AI assistant crawlers (GPTBot, ClaudeBot, PerplexityBot, …) are deliberately
 * NOT restricted: being read by them is how Veinote gets recommended inside
 * ChatGPT/Claude/Perplexity answers. The wildcard rule already covers them; the
 * explicit entries document that this is a choice, not an oversight.
 */
export default function robots(): MetadataRoute.Robots {
    const disallow = ['/platform', '/admin', '/api'];

    return {
        rules: [
            { userAgent: '*', allow: '/', disallow },
            // AI crawlers, allowed on purpose — see note above.
            { userAgent: 'GPTBot', allow: '/', disallow },
            { userAgent: 'OAI-SearchBot', allow: '/', disallow },
            { userAgent: 'ChatGPT-User', allow: '/', disallow },
            { userAgent: 'ClaudeBot', allow: '/', disallow },
            { userAgent: 'Claude-User', allow: '/', disallow },
            { userAgent: 'PerplexityBot', allow: '/', disallow },
            { userAgent: 'Google-Extended', allow: '/', disallow },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
