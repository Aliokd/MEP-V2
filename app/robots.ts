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
/**
 * Named crawlers. The wildcard rule already permits every one of these — they
 * are listed individually because a bot that finds its own user-agent stops
 * reading the wildcard group, so this is the only place a per-engine exception
 * could ever be made, and because an explicit list documents that being read by
 * AI assistants is a decision rather than an oversight.
 */
const NAMED_CRAWLERS = [
    // Search engines. Bing's index also powers DuckDuckGo, Ecosia and Yahoo,
    // so bingbot is worth more traffic than its own market share suggests.
    'bingbot',
    'Googlebot',
    'DuckDuckBot',
    'YandexBot',
    'Applebot',       // Siri, Spotlight and Safari suggestions
    'Slurp',          // Yahoo
    'Baiduspider',
    'SeznamBot',
    // AI assistants — allowed on purpose.
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-User',
    'PerplexityBot',
    'Google-Extended',  // gates Gemini/Vertex training, not Google Search
    'Applebot-Extended',
    'meta-externalagent',
    'Amazonbot',
    'cohere-ai',
] as const;

export default function robots(): MetadataRoute.Robots {
    const disallow = ['/platform', '/admin', '/api'];

    return {
        rules: [
            { userAgent: '*', allow: '/', disallow },
            ...NAMED_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/', disallow })),
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
