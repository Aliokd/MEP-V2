import { MetadataRoute } from 'next';
import { SITE_URL, localizePath } from '@/lib/i18n';

// Public pages worth indexing, with how often each changes.
const PAGES: { path: string; changeFrequency: 'weekly' | 'monthly' | 'yearly'; priority: number }[] = [
    { path: '/', changeFrequency: 'weekly', priority: 1 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/signin', changeFrequency: 'yearly', priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();

    // Each page is listed once per locale, and every entry declares the full set
    // of alternates so search engines can pair them up.
    return PAGES.flatMap(({ path, changeFrequency, priority }) => {
        const languages = {
            en: SITE_URL + localizePath(path, 'en'),
            no: SITE_URL + localizePath(path, 'no'),
            sv: SITE_URL + localizePath(path, 'sv'),
        };

        return (['en', 'no', 'sv'] as const).map(language => ({
            url: languages[language],
            lastModified,
            changeFrequency,
            // The English original stays the strongest signal of the three.
            priority: language === 'en' ? priority : priority * 0.9,
            alternates: { languages },
        }));
    });
}
