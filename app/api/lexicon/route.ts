import { NextResponse } from 'next/server';
import { featureGuard } from '@/lib/featureFlags';
import { lookup, normalizeWord, type LexiconMode, type LexiconLang } from '@/lib/lexicon';

/**
 * Rhyme / near-rhyme / synonym lookups.
 *
 * All three languages are answered from local indexes — see lib/lexicon. Nothing
 * here calls out to a third party, so there is no quota to exhaust, no key to
 * expire, and no dependency that behaves differently from a server than it does
 * from a laptop.
 *
 * English previously used Datamuse, a free keyless public API. It worked in
 * development and failed in production, most likely throttled by shared Cloud
 * Function egress IPs — a failure mode that cannot be fixed from this side. The
 * local index is built from the same underlying data Datamuse uses (CMUdict),
 * plus WordNet for synonyms.
 */

const NORDIC_CHARS = /[åäöæøÅÄÖÆØ]/;
const NORWEGIAN_MARKERS = /[æøÆØ]/;
const NORDIC_STOPWORDS = /^(och|jeg|det|att|som|til|på|vi|med|eller|men|mig|dig|sig|oss|dere|dem|vår|min|din|sin|hans|hennes|dette|mycket|tack|herre|gud|kärlek|himmel|land|norge|sverige|bra|hej|hei|takk)$/i;
const NORWEGIAN_STOPWORDS = /^(jeg|deg|meg|sig|dere|til|hei|takk)$/i;

function resolveLanguage(requested: string, word: string): 'en' | LexiconLang {
    if (requested === 'sv' || requested === 'no') return requested;
    // A Swedish or Norwegian word typed while the UI is in English should still
    // find rhymes rather than being handed to an English-only corpus.
    if (requested === 'en' && (NORDIC_CHARS.test(word) || NORDIC_STOPWORDS.test(word))) {
        return NORWEGIAN_MARKERS.test(word) || NORWEGIAN_STOPWORDS.test(word) ? 'no' : 'sv';
    }
    return 'en';
}

export async function GET(request: Request) {
    // Kill switch: an admin can disable this endpoint from the console
    // without a deploy (see lib/featureFlags.ts).
    const disabled = await featureGuard('lexicon');
    if (disabled) return disabled;

    const { searchParams } = new URL(request.url);
    const rawWord = searchParams.get('word') || '';
    const rawMode = searchParams.get('mode') || 'rhyme';
    const mode: LexiconMode =
        rawMode === 'near' || rawMode === 'synonym' ? rawMode : 'rhyme';

    const word = normalizeWord(rawWord);
    if (word.length < 2) return NextResponse.json([]);

    const lang = resolveLanguage(searchParams.get('lang') || 'en', word);

    try {
        return NextResponse.json(await lookup(word, mode, lang));
    } catch (error: any) {
        // Deliberately NOT an empty 200. This used to return [], which the UI
        // rendered as "No matches found" — making an outage indistinguishable
        // from a word that genuinely has no rhymes, and effectively invisible.
        console.error(`[Lexicon] ${lang}/${mode} lookup failed for "${word}":`, error);
        return NextResponse.json(
            {
                error: 'Lexicon lookup is temporarily unavailable. Please try again.',
                // The upstream reason, so a failure can be diagnosed from the network
                // tab without needing server log access. Carries no secrets — only
                // which dependency failed and how.
                cause: String(error?.message || error).slice(0, 200),
                lang,
                mode,
            },
            { status: 502 },
        );
    }
}
