// Shared locale routing rules. Imported by middleware (edge runtime), the root
// layout (server) and the language switcher (client), so this file must stay
// free of Node APIs and of the locale JSON itself.

export const LANGUAGES = ['en', 'no', 'sv'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Locales that carry a URL prefix. English lives at the root. */
export const PREFIXED_LOCALES = ['no', 'sv'] as const;
export type PrefixedLocale = (typeof PREFIXED_LOCALES)[number];

export const LOCALE_COOKIE = 'veinote-lang';

/** Header names middleware uses to hand the resolved locale to the server render. */
export const LANG_HEADER = 'x-veinote-lang';
export const PATH_HEADER = 'x-veinote-path';

/**
 * Per-request CSP nonce, minted in proxy.ts and read by the root layout so its
 * inline scripts can be allowed by name instead of by 'unsafe-inline'.
 */
export const NONCE_HEADER = 'x-nonce';

export const SITE_URL = 'https://veinote.com';

/**
 * Only the public marketing pages get locale URLs — they're the only ones search
 * engines index. /platform and /admin stay unprefixed and use the saved preference.
 */
export const LOCALIZED_PATHS = [
    '/',
    '/about',
    '/privacy',
    '/terms',
    '/cookies',
    '/blog',
    '/signin',
    '/onboarding',
    '/waiting-list',
    '/reset-password',
] as const;

export const isLanguage = (v: string | undefined | null): v is Language =>
    !!v && (LANGUAGES as readonly string[]).includes(v);

export const isPrefixedLocale = (v: string | undefined | null): v is PrefixedLocale =>
    !!v && (PREFIXED_LOCALES as readonly string[]).includes(v);

/**
 * Single path segments the app owns. Anything else with exactly one segment is
 * treated as a possible CMS page slug (/terms, /cookies …) and so gets locale
 * prefixes like the rest of the public site.
 *
 * This list exists because the proxy runs at the edge and can't read Firestore
 * to find out which slugs exist. The cost of guessing wrong is small: an unknown
 * slug gets a localized URL and then 404s, which is what it would have done anyway.
 */
const APP_OWNED_SEGMENTS = [
    'platform', 'admin', 'api', '_next',
    'signin', 'onboarding', 'reset-password', 'waiting-list', 'waitlist',
    // 'cookies' is an app route (the settings panel), so it must be claimed here
    // — otherwise it reads as a CMS slug and /[slug] answers for it with a 404.
    // 'blog' is the index route listing the posts; the posts themselves are
    // ordinary CMS slugs and stay out of this list.
    'about', 'privacy', 'terms', 'cookies', 'blog', 'no', 'sv', 'se',
] as const;

/** True for a single-segment path that could be a CMS-managed page. */
export const isCmsPagePath = (pathname: string): boolean => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length !== 1) return false;
    const [segment] = segments;
    if (segment.includes('.')) return false; // sitemap.xml, icon.png, robots.txt
    return !(APP_OWNED_SEGMENTS as readonly string[]).includes(segment);
};

export const isLocalizedPath = (pathname: string): boolean =>
    (LOCALIZED_PATHS as readonly string[]).includes(pathname) || isCmsPagePath(pathname);

/** "/sv/about" -> { locale: "sv", path: "/about" }; "/about" -> { locale: null, path: "/about" } */
export function splitLocale(pathname: string): { locale: PrefixedLocale | null; path: string } {
    const segment = pathname.split('/')[1];
    if (!isPrefixedLocale(segment)) return { locale: null, path: pathname };
    const rest = pathname.slice(segment.length + 1);
    return { locale: segment, path: rest === '' ? '/' : rest };
}

/** Builds the public URL for a path in a given language ("/about" + "sv" -> "/sv/about"). */
export function localizePath(pathname: string, language: Language): string {
    const { path } = splitLocale(pathname);
    if (language === 'en' || !isLocalizedPath(path)) return path;
    return path === '/' ? `/${language}` : `/${language}${path}`;
}
