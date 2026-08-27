import { MetadataRoute } from 'next';
import { SITE_URL, isCmsPagePath, localizePath } from '@/lib/i18n';
import { listPublishedPages } from '@/lib/sitePages';

// Without this, Next renders the sitemap once at build time — and the deploy
// builds run where no service account exists, so listPublishedPages() would
// fail quietly and ship a sitemap with every CMS page missing. Rendering at
// request time also means a newly published page appears in the sitemap
// immediately, without a deploy — which is the whole point of CMS rows here.
export const dynamic = 'force-dynamic';

// Public pages worth indexing, with how often each changes.
const PAGES: { path: string; changeFrequency: 'weekly' | 'monthly' | 'yearly'; priority: number }[] = [
    { path: '/', changeFrequency: 'weekly', priority: 1 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
    // Pre-launch, this is where every call to action lands — worth indexing in
    // its own right rather than only being reachable from the home page.
    { path: '/waiting-list', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
    // /terms has its own app route (CMS-backed with a code fallback), which
    // makes it "app-owned" — so the CMS branch below rightly skips it and it
    // must be listed here. A slug in APP_OWNED_SEGMENTS that isn't in this
    // array is in neither half of the sitemap.
    { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/signin', changeFrequency: 'yearly', priority: 0.5 },
];

/** One sitemap row per locale, each declaring the full alternate set. */
function localizedEntries(
    path: string,
    lastModified: Date,
    changeFrequency: 'weekly' | 'monthly' | 'yearly',
    priority: number,
): MetadataRoute.Sitemap {
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
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const lastModified = new Date();

    const staticEntries = PAGES.flatMap(({ path, changeFrequency, priority }) =>
        localizedEntries(path, lastModified, changeFrequency, priority),
    );

    // CMS-managed pages (/terms, /cookies, …) join the sitemap the moment
    // they're published, without a deploy. listPublishedPages returns [] on any
    // Firestore failure, so an outage costs the sitemap only the CMS rows.
    const cmsPages = await listPublishedPages();
    const cmsEntries = cmsPages
        // A CMS doc whose slug shadows an app route (e.g. "privacy" backing the
        // /privacy page) is already listed above under its static entry.
        .filter(page => isCmsPagePath(`/${page.slug}`))
        .flatMap(page =>
            localizedEntries(
                `/${page.slug}`,
                page.updatedAt ? new Date(page.updatedAt) : lastModified,
                'monthly',
                0.5,
            ),
        );

    return [...staticEntries, ...cmsEntries];
}
