import './globals.css';
import { Providers } from '@/context/Providers';
import Navigation from '@/components/Navigation';
import Script from 'next/script';

export const metadata = {
    title: 'Veinote - The home of human songwriting',
    description: 'No AI-generated songs. You create them. You own them.',
    icons: {
        icon: '/favicon.png',
    },
    verification: {
        google: 'SSxN1LbKQDoJkun4cXEDtoKUb4dmIu_nU7Q58USxWYs',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
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
                <Providers>
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
