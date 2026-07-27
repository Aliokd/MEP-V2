import './globals.css';
import type { Metadata } from 'next';
import { Providers } from '@/context/Providers';
import Navigation from '@/components/Navigation';
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
    const { language, fromUrl } = await resolveServerLocale();

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
                <Providers initialLanguage={language} localeFromUrl={fromUrl}>
                    <div className="min-h-screen flex flex-col">
                        <Navigation />
                        <main className="flex-grow">
                            {children}
                        </main>
                    </div>
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
