import { NextResponse } from 'next/server';
import { featureGuard } from '@/lib/featureFlags';
import { lookup, normalizeWord, type LexiconMode, type LexiconLang } from '@/lib/lexicon';

/**
 * Rhyme / near-rhyme / synonym lookups.
 *
 * English goes to Datamuse (free, native English, no key). Norwegian and Swedish
 * are answered from local indexes — see lib/lexicon. Both paths are keyless, so
 * there is no shared quota to exhaust and no per-user variation in what works.
 */

// Datamuse is a free public API and English results never change, so a small
// in-process cache is worth having. It is only ever a latency optimisation:
// a cold instance still answers correctly, it just pays the round trip.
const englishCache = new Map<string, unknown[]>();
const ENGLISH_CACHE_MAX = 500;

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

async function fetchEnglish(word: string, mode: LexiconMode) {
    const relation = mode === 'near' ? 'rel_nry' : mode === 'synonym' ? 'ml' : 'rel_rhy';
    const cacheKey = `${relation}:${word}`;

    const cached = englishCache.get(cacheKey);
    if (cached) return cached;

    const res = await fetch(
        `https://api.datamuse.com/words?${relation}=${encodeURIComponent(word)}&max=40`,
    );
    if (!res.ok) throw new Error(`Datamuse returned ${res.status}`);

    const data = await res.json();
    const formatted = (data as any[]).map(item => ({
        word: item.word,
        syllables: item.numSyllables || 1,
        score: item.score || 100,
    }));

    if (englishCache.size >= ENGLISH_CACHE_MAX) {
        englishCache.delete(englishCache.keys().next().value as string);
    }
    englishCache.set(cacheKey, formatted);
    return formatted;
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
        if (lang === 'en') {
            return NextResponse.json(await fetchEnglish(word, mode));
        }
        return NextResponse.json(await lookup(word, mode, lang));
    } catch (error: any) {
        // Deliberately NOT an empty 200. This used to return [], which the UI
        // rendered as "No matches found" — making an outage indistinguishable
        // from a word that genuinely has no rhymes, and effectively invisible.
        console.error(`[Lexicon] ${lang}/${mode} lookup failed for "${word}":`, error);
        return NextResponse.json(
            { error: 'Lexicon lookup is temporarily unavailable. Please try again.' },
            { status: 502 },
        );
    }
}
