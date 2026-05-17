import './globals.css';
import { Inter, Playfair_Display, Caveat } from 'next/font/google';
import { Providers } from '@/context/Providers';
import Navigation from '@/components/Navigation';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

const playfair = Playfair_Display({
    subsets: ['latin'],
    variable: '--font-playfair',
    display: 'swap',
});

const caveat = Caveat({
    subsets: ['latin'],
    variable: '--font-caveat',
    display: 'swap',
});

export const metadata = {
    title: 'VEINOTE | Master the Language of Music',
    description: 'Revolutionizing music education through the synthesis of technology and timeless artistry.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.variable} ${playfair.variable} ${caveat.variable} font-sans antialiased bg-white dark:bg-charcoal text-stone-900 dark:text-alabaster transition-colors duration-300`}>
                <Providers>
                    <div className="min-h-screen flex flex-col">
                        <Navigation />
                        <main className="flex-grow">
                            {children}
                        </main>
                    </div>
                </Providers>
            </body>
        </html>
    );
}
