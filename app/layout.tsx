import './globals.css';
import { Providers } from '@/context/Providers';
import Navigation from '@/components/Navigation';

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
            <body className="font-sans antialiased bg-white text-stone-900 transition-colors duration-300">
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
