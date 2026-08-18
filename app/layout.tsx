import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/context/Providers';
import Navigation from '@/components/Navigation';
import { SitePagesProvider } from '@/context/SitePagesContext';
import { getFooterPages } from '@/lib/sitePages';
import { getPublishedFaqs } from '@/lib/faqs';
import { getCopyOverrides } from '@/lib/siteCopy';
import Script from 'next/script';
import { resolveServerLocale } from '@/lib/server-locale';
import { getServerT } from '@/lib/i18n-content';
import { SITE_URL, isLocalizedPath, localizePath } from '@/lib/i18n';
import { pickLocale } from '@/lib/content';

// Until now the app shipped Next's bare default viewport tag, which left three
// mobile-browser problems open:
// - maximumScale: 1 stops iOS Safari's auto-zoom when focusing inputs styled under
//   16px (the page would jump-zoom on every small input and never zoom back).
//   Pinch-zoom still works — iOS has ignored maximum-scale for user gestures since
//   iOS 10, and Android's "force enable zoom" accessibility setting overrides it.
// - viewportFit: 'cover' opts into env(safe-area-inset-*) so bottom-anchored bars
//   can pad themselves clear of the iPhone home indicator instead of sitting under it.
// - themeColor tints Android Chrome / Safari 15+ browser chrome to the brand paper
//   tone instead of default gray.
/*
 * Typography ships with the app instead of being borrowed from the visitor's
 * machine. The stack used to start at 'Helvetica Neue', which most Windows
 * installs don't have — and where it *is* installed it is often a Thin-only
 * family, so the whole interface rendered hairline. Self-hosted Inter (bundled
 * at build time, no runtime request, CSP-safe) gives every visitor the same
 * correctly-weighted text. Swap the import here to change the typeface app-wide.
 */
const inter = Inter({
    subsets: ['latin', 'latin-ext'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-app',
    display: 'swap',
    fallback: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
});

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover',
    themeColor: '#FAF9F5',
};

const OG_LOCALES = { en: 'en_US', no: 'nb_NO', sv: 'sv_SE' } as const;

export async function generateMetadata(): Promise<Metadata> {
    const { language, path } = await resolveServerLocale();
    const t = getServerT(language);
    const canonical = SITE_URL + localizePath(path, language);

    const base: Metadata = {
        metadataBase: new URL(SITE_URL),
        title: t('meta.title'),
        description: t('meta.description'),
        applicationName: 'Veinote',
        icons: { icon: '/favicon.png' },
        // Link previews (social, chat apps) and the picture AI assistants show
        // when they cite the site. Pages with their own generateMetadata still
        // inherit this block, so the site-level card is the floor, not the ceiling.
        openGraph: {
            type: 'website',
            siteName: 'Veinote',
            url: canonical,
            title: t('meta.title'),
            description: t('meta.description'),
            locale: OG_LOCALES[language],
            images: [
                {
                    url: '/assets/footer_bg_stockholm.png',
                    width: 1024,
                    height: 529,
                    alt: 'Veinote — the home of human songwriting',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: t('meta.title'),
            description: t('meta.description'),
            images: ['/assets/footer_bg_stockholm.png'],
        },
        verification: { google: 'SSxN1LbKQDoJkun4cXEDtoKUb4dmIu_nU7Q58USxWYs' },
    };

    // hreflang only makes sense on the pages that actually have locale URLs.
    if (!isLocalizedPath(path)) return base;

    return {
        ...base,
        alternates: {
            canonical,
            languages: {
                en: SITE_URL + localizePath(path, 'en'),
                no: SITE_URL + localizePath(path, 'no'),
                sv: SITE_URL + localizePath(path, 'sv'),
                'x-default': SITE_URL + localizePath(path, 'en'),
            },
        },
    };
}

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { language, fromUrl, path } = await resolveServerLocale();

    // Fetched here rather than in the footer so the links land in the
    // server-rendered HTML — legal pages have to be crawlable. Cached for a
    // minute inside getFooterPages(), so this isn't a Firestore read per request.
    const footerPages = await getFooterPages();
    const footerLinks = footerPages.map((page) => ({ slug: page.slug, title: page.title }));

    // The Q&A accordion only exists on the homepage, so only pay for it there.
    const faqs =
        path === "/"
            ? (await getPublishedFaqs()).map((faq) => ({
                  id: faq.id,
                  question: faq.question,
                  answer: faq.answer,
              }))
            : [];

    // Per-string overrides for the pages that stay in code (homepage, /about).
    // Cached for a minute; an empty map means the locale files are used as-is.
    const copyOverrides = await getCopyOverrides();

    // Structured data for the homepage: who Veinote is, what kind of product it
    // is, and the Q&A pairs the page visibly renders. This is what search
    // engines and AI assistants parse to describe/recommend the product, so it
    // must stay in lockstep with what the page actually shows — the FAQ list is
    // the same CMS data the accordion below renders, not a separate copy.
    let jsonLd: object | null = null;
    if (path === '/') {
        const t = getServerT(language, copyOverrides);
        jsonLd = {
            '@context': 'https://schema.org',
            '@graph': [
                {
                    '@type': 'Organization',
                    '@id': `${SITE_URL}/#organization`,
                    name: 'Veinote',
                    url: SITE_URL,
                    logo: `${SITE_URL}/assets/Veinote%20logo%20TM.svg`,
                    description: t('meta.description'),
                },
                {
                    '@type': 'WebSite',
                    '@id': `${SITE_URL}/#website`,
                    name: 'Veinote',
                    url: SITE_URL,
                    publisher: { '@id': `${SITE_URL}/#organization` },
                    inLanguage: ['en', 'nb', 'sv'],
                },
                {
                    '@type': 'SoftwareApplication',
                    name: 'Veinote',
                    url: SITE_URL,
                    applicationCategory: 'MultimediaApplication',
                    operatingSystem: 'Web browser',
                    description: t('meta.description'),
                },
                ...(faqs.length > 0
                    ? [
                          {
                              '@type': 'FAQPage',
                              mainEntity: faqs.map((faq) => ({
                                  '@type': 'Question',
                                  name: pickLocale(faq.question, language),
                                  acceptedAnswer: {
                                      '@type': 'Answer',
                                      text: pickLocale(faq.answer, language),
                                  },
                              })),
                          },
                      ]
                    : []),
            ],
        };
    }

    return (
        <html lang={language} className={inter.variable} suppressHydrationWarning>
            <head>
                {jsonLd && (
                    <script
                        type="application/ld+json"
                        // CMS-authored text ends up in this string; escaping "<"
                        // keeps a malicious answer from closing the script tag.
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
                        }}
                    />
                )}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            if (window.location.hostname === 'mep-v2.web.app' || window.location.hostname === 'mep-v2.firebaseapp.com') {
                                window.location.replace('https://veinote.com' + window.location.pathname + window.location.search + window.location.hash);
                            }
                        `
                    }}
                />
            </head>
            <body className="font-sans antialiased bg-white text-stone-900 transition-colors duration-300">
                <Providers initialLanguage={language} localeFromUrl={fromUrl} copyOverrides={copyOverrides}>
                    <SitePagesProvider links={footerLinks} faqs={faqs}>
                        <div className="min-h-screen flex flex-col">
                            <Navigation />
                            <main className="flex-grow">
                                {children}
                            </main>
                        </div>
                    </SitePagesProvider>
                </Providers>
                <Script id="microsoft-clarity" strategy="afterInteractive">
                    {`
                        (function(c,l,a,r,i,t,y){
                            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                        })(window, document, "clarity", "script", "xovh69ah42");
                    `}
                </Script>
            </body>
        </html>
    );
}
