import './globals.css';
import type { Metadata } from 'next';
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

export async function generateMetadata(): Promise<Metadata> {
    const { language, path } = await resolveServerLocale();
    const t = getServerT(language);
    const canonical = SITE_URL + localizePath(path, language);

    const base: Metadata = {
        title: t('meta.title'),
        description: t('meta.description'),
        icons: { icon: '/favicon.png' },
        verification: { google: 'SSxN1LbKQDoJkun4cXEDtoKUb4dmIu_nU7Q58USxWYs' },
    };

    // hreflang only makes sense on the pages that actually have locale URLs.
    if (!isLocalizedPath(path)) return base;

    return {
        ...base,
        metadataBase: new URL(SITE_URL),
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

    return (
        <html lang={language} suppressHydrationWarning>
            <head>
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
