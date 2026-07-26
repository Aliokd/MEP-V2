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

export const SITE_URL = 'https://veinote.com';

/**
 * Only the public marketing pages get locale URLs — they're the only ones search
 * engines index. /platform and /admin stay unprefixed and use the saved preference.
 */
export const LOCALIZED_PATHS = [
    '/',
    '/about',
    '/privacy',
    '/signin',
    '/onboarding',
    '/reset-password',
] as const;

export const isLanguage = (v: string | undefined | null): v is Language =>
    !!v && (LANGUAGES as readonly string[]).includes(v);

export const isPrefixedLocale = (v: string | undefined | null): v is PrefixedLocale =>
    !!v && (PREFIXED_LOCALES as readonly string[]).includes(v);

export const isLocalizedPath = (pathname: string): boolean =>
    (LOCALIZED_PATHS as readonly string[]).includes(pathname);

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
