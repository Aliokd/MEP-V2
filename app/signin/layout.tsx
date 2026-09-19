import type { Metadata } from 'next';
import { resolveServerLocale } from '@/lib/server-locale';
import { getServerT } from '@/lib/i18n-content';
import { getCopyOverrides } from '@/lib/siteCopy';

/**
 * The sign-in page is a client component, so its metadata lives here. Without
 * this it inherited the root layout's title and description, and the search
 * result for /signin read like a second home page. Same pattern as /about:
 * the locale files carry the words, the proxy carries the language.
 */
export async function generateMetadata(): Promise<Metadata> {
    const { language } = await resolveServerLocale();
    const t = getServerT(language, await getCopyOverrides());
    return {
        title: `${t('signin.sign_in')} | Veinote`,
        description: t('signin.subtitle'),
    };
}

export default function SignInLayout({ children }: { children: React.ReactNode }) {
    return children;
}
