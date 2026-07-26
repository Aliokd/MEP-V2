/**
 * Builds the offline rhyme + synonym indexes for Norwegian and Swedish.
 *
 *   npm run build:lexicon
 *
 * Reads the Hunspell word lists (devDependencies) and the vendored MyThes
 * thesauri, and writes compact JSON into lib/lexicon/data/.
 *
 * Why offline: Nordic spelling maps to pronunciation regularly enough that a
 * rhyme is a suffix match from the last stressed vowel, so this needs no model.
 * The previous Gemini-backed implementation cost a shared per-project quota,
 * failed silently once that quota was hit, and invented words that don't exist
 * ("bensam", "tillsam", "skinter"). This is deterministic, free and instant.
 *
 * See vendor/lexicon/README.md for data licensing — output is server-side only.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IterableHunspellReader } from 'hunspell-reader';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'lib', 'lexicon', 'data');

// Shared by both languages. Swedish uses ä/ö, Norwegian æ/ø, so the union is safe.
const VOWELS = 'aeiouyåäöæø';
const WORD_RE = /^[a-zåäöæøéèêüàáóç]{2,14}$/;

/** Rhyme key: everything from the penultimate vowel on ("hjärta" -> "ärta"), which
 *  is what makes hjärta/smärta/svärta collide. Single-vowel words fall back to the
 *  last vowel ("hus" -> "us") so monosyllables still rhyme with each other. */
function rhymeKey(word) {
    const positions = [];
    for (let i = 0; i < word.length; i++) {
        if (VOWELS.includes(word[i])) positions.push(i);
    }
    if (positions.length === 0) return null;
    return word.slice(positions[positions.length - (positions.length >= 2 ? 2 : 1)]);
}

/** Vowel skeleton of the tail, e.g. "hjärta" -> "ä-a". Two words sharing this
 *  assonate even when their consonants differ (hjärta/värma), which is what the
 *  "near" mode looks for. */
function assonanceKey(word) {
    const vowels = [...word].filter(c => VOWELS.includes(c));
    if (vowels.length === 0) return null;
    return vowels.slice(-2).join('-');
}

/** Real Swedish/Norwegian words of one or two letters worth offering as rhymes.
 *  Everything else that short in the Hunspell expansions is an abbreviation or
 *  affix fragment ("ig", "us"), which shortest-first ranking would otherwise put
 *  at the very top of every rhyme list. */
const NORDIC_SHORT_WORDS = new Set([
    'bo', 'ro', 'gå', 'må', 'nå', 'så', 'se', 'le', 'ny', 'nu', 'ju', 'du',
    'vi', 'ni', 'de', 'ha', 'ge', 'gi', 'be', 'ta', 'tå', 'rå', 'ku', 'by',
    'sy', 'dø', 'ö', 'å', 'ø', 'öl', 'øl', 'ur', 'os', 'is', 'el', 'ek',
]);

async function expandWordList(pkg) {
    const aff = join(ROOT, 'node_modules', pkg, 'index.aff');
    const dic = join(ROOT, 'node_modules', pkg, 'index.dic');
    const reader = await IterableHunspellReader.createFromFiles(aff, dic);

    const words = new Set();
    for (const raw of reader.iterateWords()) {
        const word = String(raw).trim().toLowerCase();
        if (!WORD_RE.test(word)) continue;
        if (word.length <= 2 && !NORDIC_SHORT_WORDS.has(word)) continue;
        words.add(word);
    }
    return words;
}

/** MyThes format:  word|senseCount  then one "(pos)|syn|syn" line per sense. */
function parseThesaurus(file) {
    const text = readFileSync(file, 'latin1');
    const lines = text.split(/\r?\n/);
    const map = new Map();

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.startsWith('-') || line.startsWith('(')) continue;

        const [headword, senseCount] = line.split('|');
        const senses = Number(senseCount);
        if (!headword || !Number.isFinite(senses) || senses < 1) continue;

        const key = headword.trim().toLowerCase();
        if (!WORD_RE.test(key)) continue;

        const collected = new Set();
        for (let s = 1; s <= senses && i + s < lines.length; s++) {
            // First field is the part-of-speech marker, not a synonym.
            for (const syn of lines[i + s].split('|').slice(1)) {
                const clean = syn.trim().toLowerCase();
                if (WORD_RE.test(clean) && clean !== key) collected.add(clean);
            }
        }
        i += senses;

        if (collected.size) {
            const existing = map.get(key);
            if (existing) collected.forEach(c => existing.add(c));
            else map.set(key, collected);
        }
    }
    return map;
}

// The API never returns more than 40 matches, so keeping every word for a common
// ending is dead weight — "-ingen" alone has thousands, almost all long compounds.
// Cap each bucket at a little over what can actually be shown.
const RHYME_BUCKET_CAP = 60;
const NEAR_BUCKET_CAP = 120;
const SYNONYM_CAP = 25;

function buildLanguage(words, synonyms) {
    const rhymeBuckets = new Map();
    const nearBuckets = new Map();

    for (const word of words) {
        const rk = rhymeKey(word);
        if (rk) push(rhymeBuckets, rk, word);
        const ak = assonanceKey(word);
        if (ak) push(nearBuckets, ak, word);
    }

    // Every word in a rhyme bucket ends with that bucket's key by construction, so
    // only the leading part is stored and the route re-appends the key on read.
    // Roughly halves the file.
    const rhyme = {};
    for (const [key, bucket] of rhymeBuckets) {
        if (bucket.length < 2) continue;
        rhyme[key] = bucket
            .sort(byUsefulness)
            .slice(0, RHYME_BUCKET_CAP)
            .map(word => word.slice(0, word.length - key.length));
    }

    const near = {};
    for (const [key, bucket] of nearBuckets) {
        if (bucket.length < 2) continue;
        near[key] = bucket.sort(byUsefulness).slice(0, NEAR_BUCKET_CAP);
    }

    const syn = {};
    for (const [word, set] of synonyms) {
        // Only keep synonyms the word list can also vouch for as real words.
        const vetted = [...set].filter(s => words.has(s));
        if (vetted.length) syn[word] = vetted.sort(byUsefulness).slice(0, SYNONYM_CAP);
    }

    return { rhyme, near, syn };
}

function push(map, key, value) {
    const bucket = map.get(key);
    if (bucket) bucket.push(value);
    else map.set(key, [value]);
}

/** No frequency data ships with these lists, so approximate it: shorter words are
 *  overwhelmingly the common ones, and long entries are almost all compounds
 *  ("moderskärlek", "admiralitetsbue") that a songwriter does not want first. */
function byUsefulness(a, b) {
    return a.length - b.length || a.localeCompare(b);
}

/**
 * English is built differently, because English spelling lies: "though", "through"
 * and "tough" share four final letters and rhyme with none of each other. Suffix
 * matching — which works for Nordic orthography — produces nonsense here, so this
 * uses CMUdict's phonemes instead. A rhyme is identical phonemes from the last
 * stressed vowel onward, which is how a rhyming dictionary actually works.
 *
 * This replaces a dependency on Datamuse, a free keyless public API that worked
 * from a laptop but not reliably from a Cloud Function on shared egress IPs.
 */
function buildEnglish(cmudict, synonyms, vocabulary) {
    const rhyme = new Map();
    const near = new Map();
    const syllables = {};

    for (const [rawWord, phonemeString] of Object.entries(cmudict)) {
        // CMUdict lists alternate pronunciations as "word(1)"; the base entry is enough.
        if (rawWord.includes('(') || !WORD_RE.test(rawWord)) continue;

        // CMUdict is a pronunciation dictionary, not a word list: it carries surnames,
        // initials and abbreviations ("bo", "jo", "ko", "keim") that are phonetically
        // valid but useless as rhymes. WordNet's vocabulary is the filter for "is this
        // actually an English word a songwriter would use".
        if (!vocabulary.has(rawWord)) continue;

        // WordNet also lists two-letter chemical symbols and abbreviations as nouns
        // ("co", "mo", "po", "au"), and shortest-first ranking pushes them straight to
        // the top of every rhyme list. Genuine two-letter English words are a closed
        // set, so enumerate them rather than lose the good ones.
        if (rawWord.length === 2 && !TWO_LETTER_WORDS.has(rawWord)) continue;

        const phonemes = phonemeString.split(' ');
        // A phoneme carrying a stress digit is a vowel.
        const vowelPositions = phonemes
            .map((p, i) => (/\d/.test(p) ? i : -1))
            .filter(i => i >= 0);
        if (vowelPositions.length === 0) continue;

        syllables[rawWord] = vowelPositions.length;

        // Prefer the last primary-stressed vowel; fall back to the last vowel so
        // unstressed monosyllables still rhyme with each other.
        const primary = vowelPositions.filter(i => phonemes[i].endsWith('1'));
        const from = (primary.length ? primary : vowelPositions)[
            (primary.length ? primary : vowelPositions).length - 1
        ];

        // Stress digits are dropped so OW1 and OW2 rhyme, which they do.
        const key = phonemes.slice(from).map(p => p.replace(/\d/g, '')).join(' ');
        push(rhyme, key, rawWord);

        // Near rhyme: the stressed vowel alone, so consonants may differ (assonance).
        push(near, phonemes[from].replace(/\d/g, ''), rawWord);
    }

    // Most senses first, then shortest. Sense count is the closest thing to a
    // frequency signal available here, and it is what keeps "show" and "know" above
    // "ceo" and "cfo" in the rhymes for "go".
    const byCommonness = (a, b) =>
        (vocabulary.get(b) || 0) - (vocabulary.get(a) || 0) || a.length - b.length || a.localeCompare(b);

    const trim = (map, cap) => {
        const out = {};
        for (const [key, bucket] of map) {
            if (bucket.length < 2) continue;
            out[key] = bucket.sort(byCommonness).slice(0, cap);
        }
        return out;
    };

    const syn = {};
    for (const [word, set] of synonyms) {
        const vetted = [...set].filter(s => syllables[s] !== undefined);
        if (vetted.length) syn[word] = vetted.sort(byCommonness).slice(0, SYNONYM_CAP);
    }

    return { rhyme: trim(rhyme, RHYME_BUCKET_CAP), near: trim(near, NEAR_BUCKET_CAP), syn, syllables };
}

/**
 * WordNet catalogues language as it is used, including its coarsest senses: it lists
 * several obscenities as synonyms of "love". Correct lexicography, wrong thing to
 * surface unprompted in a songwriting tool used by strangers and children. Blocked
 * from *suggestions* only — nothing stops anyone writing these words themselves.
 */
const SYNONYM_BLOCKLIST = new Set([
    'fuck', 'fucking', 'fucked', 'cunt', 'shit', 'shitting', 'piss', 'pissing',
    'cock', 'prick', 'dick', 'twat', 'wank', 'bugger', 'screw', 'screwing',
    'bang', 'bonk', 'hump', 'shag', 'ass', 'arse', 'bitch', 'whore', 'slut',
    'nigger', 'spic', 'kike', 'wop', 'chink', 'fag', 'faggot', 'dyke', 'retard',
]);

/** The complete set of two-letter words worth offering as a rhyme. Everything else
 *  of that length in WordNet is a symbol or abbreviation. */
const TWO_LETTER_WORDS = new Set([
    'am', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'hi', 'if', 'in', 'is',
    'it', 'me', 'my', 'no', 'of', 'oh', 'ok', 'on', 'or', 'so', 'to', 'up', 'us',
    'we', 'ah', 'aw', 'ay', 'ho', 'la', 'lo', 'ma', 'pa', 'ye',
]);

/**
 * Every word WordNet knows, mapped to how many senses it has.
 *
 * The sense count doubles as a commonness signal, which English badly needs for
 * ranking: "go" carries dozens of senses, "ceo" carries one. Sorting rhymes by
 * length — which works for Nordic compounds — puts every three-letter acronym
 * above the words anyone actually wants.
 */
function wordNetVocabulary(dictPath) {
    const senses = new Map();
    for (const pos of ['noun', 'verb', 'adj', 'adv']) {
        const text = readFileSync(join(dictPath, `index.${pos}`), 'latin1');
        for (const line of text.split('\n')) {
            if (!line || line.startsWith('  ')) continue;
            // lemma pos synset_cnt ...
            const fields = line.split(' ');
            const word = fields[0];
            if (!word || word.includes('_') || !WORD_RE.test(word)) continue;
            const count = parseInt(fields[2], 10) || 1;
            senses.set(word, (senses.get(word) || 0) + count);
        }
    }
    return senses;
}

/** WordNet stores each sense as a synset; every word inside one is a synonym of
 *  the rest. Multi-word entries ("take_a_breath") are skipped — a songwriter wants
 *  single words. */
function parseWordNet(dictPath) {
    const map = new Map();

    const mergeCluster = (words) => {
        for (const word of words) {
            const bucket = map.get(word) || new Set();
            words.forEach(other => { if (other !== word) bucket.add(other); });
            map.set(word, bucket);
        }
    };

    /** offset lex_filenum ss_type w_cnt (word lex_id)... p_cnt (ptr)... */
    const parseSynset = (fields) => {
        const wordCount = parseInt(fields[3], 16);
        if (!Number.isFinite(wordCount) || wordCount < 1) return null;
        const words = [];
        for (let i = 0; i < wordCount; i++) {
            const word = fields[4 + i * 2]?.toLowerCase();
            if (word && !word.includes('_') && WORD_RE.test(word) && !SYNONYM_BLOCKLIST.has(word)) {
                words.push(word);
            }
        }
        // Pointers follow the words: count, then symbol/offset/pos/source-target quads.
        const pointerBase = 4 + wordCount * 2;
        const pointerCount = parseInt(fields[pointerBase], 10) || 0;
        const similarTo = [];
        for (let i = 0; i < pointerCount; i++) {
            const symbol = fields[pointerBase + 1 + i * 4];
            if (symbol === '&') similarTo.push(fields[pointerBase + 2 + i * 4]);
        }
        return { offset: fields[0], words, similarTo };
    };

    for (const pos of ['noun', 'verb', 'adj', 'adv']) {
        const text = readFileSync(join(dictPath, `data.${pos}`), 'latin1');
        const synsets = [];
        for (const line of text.split('\n')) {
            if (!line || line.startsWith('  ')) continue; // licence header
            const synset = parseSynset(line.split(' '));
            if (synset) synsets.push(synset);
        }

        // Words sharing a synset are synonyms of each other.
        for (const { words } of synsets) {
            if (words.length >= 2) mergeCluster(words);
        }

        // Adjectives keep most of their synonyms in *satellite* synsets attached by
        // "&" (similar-to) pointers, not in the head synset itself — "beautiful"
        // sits alone in its synset with "gorgeous", "lovely" etc. linked as
        // satellites. Same-synset-only parsing left common adjectives with no
        // synonyms at all, so the cluster here is head + satellites combined.
        if (pos === 'adj') {
            const byOffset = new Map(synsets.map(s => [s.offset, s]));
            for (const synset of synsets) {
                if (synset.similarTo.length === 0) continue;
                const cluster = new Set(synset.words);
                for (const target of synset.similarTo) {
                    byOffset.get(target)?.words.forEach(w => cluster.add(w));
                }
                if (cluster.size >= 2) mergeCluster([...cluster]);
            }
        }
    }
    return map;
}

async function main() {
    mkdirSync(OUT_DIR, { recursive: true });

    const languages = [
        { code: 'sv', pkg: 'dictionary-sv', thesaurus: 'th_sv_SE.dat' },
        { code: 'no', pkg: 'dictionary-nb', thesaurus: 'th_nb_NO.dat' },
    ];

    for (const { code, pkg, thesaurus } of languages) {
        process.stdout.write(`[lexicon] ${code}: expanding ${pkg}… `);
        const words = await expandWordList(pkg);
        process.stdout.write(`${words.size.toLocaleString()} forms\n`);

        const synonyms = parseThesaurus(join(ROOT, 'vendor', 'lexicon', thesaurus));
        const data = buildLanguage(words, synonyms);

        const file = join(OUT_DIR, `${code}.json`);
        writeFileSync(file, JSON.stringify(data));

        const mb = (readFileSync(file).length / 1024 / 1024).toFixed(2);
        console.log(
            `[lexicon] ${code}: ${Object.keys(data.rhyme).length.toLocaleString()} rhyme keys, ` +
            `${Object.keys(data.syn).length.toLocaleString()} synonym entries → ${mb} MB`
        );
    }

    // English: phoneme-based, from CMUdict + WordNet.
    process.stdout.write('[lexicon] en: reading CMUdict + WordNet… ');
    const { dictionary: cmudict } = await import('cmu-pronouncing-dictionary');
    const wordnet = await import('wordnet-db');
    const dictPath = (wordnet.default ?? wordnet).path;
    const synonyms = parseWordNet(dictPath);
    const vocabulary = wordNetVocabulary(dictPath);
    process.stdout.write(
        `${Object.keys(cmudict).length.toLocaleString()} pronunciations, ` +
        `${vocabulary.size.toLocaleString()} vocabulary\n`
    );

    const en = buildEnglish(cmudict, synonyms, vocabulary);
    const enFile = join(OUT_DIR, 'en.json');
    writeFileSync(enFile, JSON.stringify(en));
    console.log(
        `[lexicon] en: ${Object.keys(en.rhyme).length.toLocaleString()} rhyme keys, ` +
        `${Object.keys(en.syn).length.toLocaleString()} synonym entries → ` +
        `${(readFileSync(enFile).length / 1024 / 1024).toFixed(2)} MB`
    );
}

main().catch(err => {
    console.error('[lexicon] build failed:', err);
    process.exit(1);
});
