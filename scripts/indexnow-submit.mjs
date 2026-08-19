#!/usr/bin/env node
/**
 * Submits every URL in the live sitemap to IndexNow (Bing, Yandex, Seznam,
 * Naver, Yep).
 *
 * The per-page ping in the admin API covers ordinary editing. This script is for
 * the cases that ping can't see: the first submission after IndexNow is set up,
 * and a deploy that changes pages which live in code rather than in the CMS.
 *
 *   node scripts/indexnow-submit.mjs            # read https://veinote.com/sitemap.xml
 *   node scripts/indexnow-submit.mjs --dry-run  # print the URLs, submit nothing
 *   node scripts/indexnow-submit.mjs --sitemap=http://localhost:3000/sitemap.xml --dry-run
 *
 * The sitemap is read over the network rather than imported, so this runs
 * against whatever is actually deployed — no build step, no Firebase creds.
 */

const SITE_URL = 'https://veinote.com';
// Must match INDEXNOW_KEY in lib/indexnow.ts and public/<key>.txt.
const KEY = 'ef768f626d16103bee75fc557202539c';

const dryRun = process.argv.includes('--dry-run');
const override = process.argv.find((a) => a.startsWith('--sitemap='))?.slice('--sitemap='.length);

// A sitemap from anywhere but production lists URLs IndexNow would reject, so
// pointing this at localhost or a preview deploy is an inspection-only mode.
if (override && !dryRun) {
    process.stderr.write('--sitemap can only be used together with --dry-run\n');
    process.exit(1);
}

async function main() {
    const sitemapUrl = override || `${SITE_URL}/sitemap.xml`;
    process.stdout.write(`Reading ${sitemapUrl}\n`);

    const res = await fetch(sitemapUrl);
    if (!res.ok) {
        throw new Error(`Sitemap fetch failed with ${res.status}`);
    }

    const xml = await res.text();
    // <loc> only ever holds a URL here, so a regex beats pulling in a parser.
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

    if (urls.length === 0) throw new Error('No <loc> entries found in the sitemap');
    process.stdout.write(`Found ${urls.length} URL(s)\n`);

    if (dryRun) {
        for (const url of urls) process.stdout.write(`  ${url}\n`);
        process.stdout.write('\nDry run — nothing submitted.\n');
        return;
    }

    const submit = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
            host: new URL(SITE_URL).host,
            key: KEY,
            keyLocation: `${SITE_URL}/${KEY}.txt`,
            urlList: urls,
        }),
    });

    if (submit.status === 200 || submit.status === 202) {
        const note = submit.status === 202 ? ' (key verification pending)' : '';
        process.stdout.write(`Submitted ${urls.length} URL(s) — HTTP ${submit.status}${note}\n`);
        return;
    }

    const body = await submit.text();
    throw new Error(
        `IndexNow rejected the submission with HTTP ${submit.status}: ${body}\n` +
            `Check that ${SITE_URL}/${KEY}.txt is reachable and contains exactly the key.`,
    );
}

main().catch((err) => {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
});
