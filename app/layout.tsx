import './globals.css';
import { Inter, Playfair_Display } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata = {
    title: 'MEP V2 | The Conservatory',
    description: 'Master the Language of Music',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={`${inter.variable} ${playfair.variable} font-sans bg-charcoal text-alabaster antialiased`}>
                {children}
            </body>
        </html>
    );
}
