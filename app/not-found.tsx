import type { Metadata } from 'next';
import NotFoundScreen from './not-found-screen';

/**
 * A 404 must not be indexed as a real page, and must not inherit the site-level
 * OG card either — a broken link shared in a chat should preview as nothing.
 */
export const metadata: Metadata = {
    title: 'Page not found | Veinote',
    robots: { index: false, follow: true },
    openGraph: undefined,
    twitter: undefined,
};

export default function NotFound() {
    return <NotFoundScreen />;
}
