import { NextRequest, NextResponse } from 'next/server';
import {
    LANG_HEADER,
    LOCALE_COOKIE,
    PATH_HEADER,
    isLocalizedPath,
    isPrefixedLocale,
    splitLocale,
    type Language,
} from '@/lib/i18n';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Passes the resolved locale and the un-prefixed path down to the server render. */
function withLocaleHeaders(req: NextRequest, language: Language, path: string) {
    const headers = new Headers(req.headers);
    headers.set(LANG_HEADER, language);
    headers.set(PATH_HEADER, path);
    return headers;
}

export default function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // "se" is Sweden's country code; the language code is "sv". People type both,
    // so redirect the country form to the canonical language form.
    if (pathname === '/se' || pathname.startsWith('/se/')) {
        const url = req.nextUrl.clone();
        url.pathname = '/sv' + pathname.slice(3);
        return NextResponse.redirect(url, 301);
    }

    // The waitlist page shipped at /waitlist and was renamed to /waiting-list.
    // It was live and in the sitemap, so the old path keeps working rather than
    // 404ing anyone who already has the link. Handled here rather than in
    // next.config so the locale prefix survives: /no/waitlist -> /no/waiting-list.
    if (pathname === '/waitlist' || pathname.endsWith('/waitlist')) {
        const url = req.nextUrl.clone();
        url.pathname = pathname.slice(0, -'/waitlist'.length) + '/waiting-list';
        return NextResponse.redirect(url, 301);
    }

    const { locale, path } = splitLocale(pathname);

    if (locale) {
        // Locale prefixes only exist for the public pages. Anything else (a stray
        // /no/platform link) drops the prefix rather than 404ing.
        if (!isLocalizedPath(path)) {
            const url = req.nextUrl.clone();
            url.pathname = path;
            return NextResponse.redirect(url);
        }

        const url = req.nextUrl.clone();
        url.pathname = path;
        const res = NextResponse.rewrite(url, {
            request: { headers: withLocaleHeaders(req, locale, path) },
        });
        res.cookies.set(LOCALE_COOKIE, locale, {
            path: '/',
            maxAge: COOKIE_MAX_AGE,
            sameSite: 'lax',
        });
        return res;
    }

    // No prefix. Send a returning Norwegian/Swedish visitor to their localized URL
    // so the address bar matches the language they're reading. Crawlers carry no
    // cookie, so they always get the English page and reach /no and /sv via hreflang.
    if (isLocalizedPath(pathname)) {
        const saved = req.cookies.get(LOCALE_COOKIE)?.value;
        if (isPrefixedLocale(saved)) {
            const url = req.nextUrl.clone();
            url.pathname = pathname === '/' ? `/${saved}` : `/${saved}${pathname}`;
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next({
        request: { headers: withLocaleHeaders(req, 'en', pathname) },
    });
}

export const config = {
    // Skip API routes, Next internals, and anything with a file extension.
    matcher: ['/((?!api|_next/static|_next/image|.*\\.).*)'],
};
