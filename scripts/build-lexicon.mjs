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
import { writeFileSync, mkdirSync, readFileSync, existsSync, createReadStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'lib', 'lexicon', 'data');

const WORD_RE = /^[a-zåäöæøéèêüàáóç]{2,14}$/;

/** Real Swedish/Norwegian words of one or two letters worth offering as rhymes.
 *  Everything else that short in the source data is an abbreviation or affix
 *  fragment, which ranking would otherwise surface. */
const NORDIC_SHORT_WORDS = new Set([
    'bo', 'ro', 'gå', 'må', 'nå', 'så', 'se', 'le', 'ny', 'nu', 'ju', 'du',
    'vi', 'ni', 'de', 'ha', 'ge', 'gi', 'be', 'ta', 'tå', 'rå', 'ku', 'by',
    'sy', 'dø', 'ö', 'å', 'ø', 'öl', 'øl', 'ur', 'os', 'is', 'el', 'ek',
]);

// ─── NST pronunciation lexicons (Språkbanken / Norwegian National Library) ────
//
// Nordic rhymes were originally keyed on SPELLING, which Swedish and Norwegian
// are regular enough to make ~90% right — but the misses were exactly the words
// songwriters use most: "mig" is pronounced "mej" (rhymes dig/sig/nej, not
// krig/stig), "meg"/"deg" share the diphthong /æi/, kärlek starts with the
// tje-sound. The NST lexicons carry curated SAMPA transcriptions for ~650k
// inflected forms per language, letting Nordic use the exact phoneme-key
// architecture English already uses with CMUdict.
//
// The raw files are ~180 MB each, so they are NOT committed (vendor/lexicon/nst
// is gitignored); this downloads and unpacks them on demand. The generated
// output in lib/lexicon/data IS committed, so CI never needs the download unless
// the lexicon is deliberately rebuilt.

const NST_SOURCES = {
    sv: {
        url: 'https://www.nb.no/sbfil/leksikalske_databaser/leksikon/sv.leksikon.tar.gz',
        pron: 'swe030224NST.pron',
        tarPath: 'NST svensk leksikon/swe030224NST.pron/swe030224NST.pron',
    },
    no: {
        url: 'https://www.nb.no/sbfil/leksikalske_databaser/leksikon/no.leksikon.tar.gz',
        pron: 'nor030224NST.pron',
        tarPath: 'NSTs norske leksikon/nor030224NST.pron/nor030224NST.pron',
    },
};

function ensureNstFile(code) {
    const source = NST_SOURCES[code];
    const target = join(ROOT, 'vendor', 'lexicon', 'nst', source.pron);
    if (existsSync(target)) return target;

    console.log(`[lexicon] ${code}: NST lexicon missing, downloading (~20 MB compressed)…`);
    const work = join(tmpdir(), `nst-${code}-${Date.now()}`);
    mkdirSync(work, { recursive: true });
    mkdirSync(dirname(target), { recursive: true });
    const tarball = join(work, 'lex.tar.gz');
    execFileSync('curl', ['-sL', '-o', tarball, '--max-time', '300', source.url], { stdio: 'inherit' });
    execFileSync('tar', ['xzf', tarball, '-C', work], { stdio: 'inherit' });
    execFileSync(process.platform === 'win32' ? 'cmd' : 'cp',
        process.platform === 'win32'
            ? ['/c', 'copy', '/y', join(work, source.tarPath).replaceAll('/', '\\'), target.replaceAll('/', '\\')]
            : [join(work, source.tarPath), target],
        { stdio: 'inherit' });
    return target;
}

/** Streams an NST .pron file (too large for readFileSync) into orth → SAMPA.
 *  Field 0 is the orthography, field 11 the transcription. First entry wins —
 *  later rows are alternate pronunciations and rarer readings. */
async function parseNstPron(file) {
    const pron = new Map();
    const rl = createInterface({ input: createReadStream(file, { encoding: 'latin1' }) });
    for await (const line of rl) {
        const fields = line.split(';');
        const orth = fields[0]?.toLowerCase();
        const trans = fields[11];
        if (!orth || !trans || pron.has(orth)) continue;
        if (!WORD_RE.test(orth)) continue;
        if (orth.length <= 2 && !NORDIC_SHORT_WORDS.has(orth)) continue;
        pron.set(orth, trans);
    }
    return pron;
}

/** word → corpus frequency, from the OpenSubtitles-derived 50k lists. This is
 *  what keeps "blommar" above "vommar" in the rhymes for "sommar" — the
 *  shortest-first heuristic had no way to tell a common word from a rare one. */
function parseFrequency(file) {
    const freq = new Map();
    for (const line of readFileSync(file, 'utf8').split('\n')) {
        const [word, count] = line.split(' ');
        if (word && count) freq.set(word.toLowerCase(), Number(count));
    }
    return freq;
}

// NST SAMPA vowel characters (Swedish + Norwegian union). ':' marks length and
// '*' joins diphthongs ("m{*I"); both continue a nucleus rather than start one.
const NST_VOWELS = 'aeiouyAEIOUY29@{}';

/** Phonetic rhyme + assonance keys from an NST transcription: everything from
 *  the vowel of the last STRESSED syllable onward — primary '"' (doubled for
 *  tonal accent 2) or secondary '%'. Secondary counts on purpose: Nordic
 *  compounds carry primary stress on the first element and secondary on the
 *  last, and song rhyming works on that final element — "kärlek" rhymes on
 *  "-lek" ('%' syllable), not on a full "-ärlek" tail nothing else shares.
 *  Anchoring only on primary left every compound rhymeless. '$' = syllable. */
function nstKeys(trans) {
    const tail = trans.slice(Math.max(trans.lastIndexOf('"'), trans.lastIndexOf('%')) + 1);
    let vowelAt = -1;
    for (let i = 0; i < tail.length; i++) {
        if (NST_VOWELS.includes(tail[i])) { vowelAt = i; break; }
    }
    if (vowelAt < 0) return null;
    const rhyme = tail.slice(vowelAt).replace(/[$%"]/g, '');
    let nucleus = '';
    for (const ch of rhyme) {
        if (NST_VOWELS.includes(ch) || ch === ':' || ch === '*') nucleus += ch;
        else break;
    }
    return { rhyme, near: nucleus };
}

/** NST marks every syllable boundary with '$', so the count is direct. */
function nstSyllables(trans) {
    return trans.split('$').length;
}

// The UI never renders more than 40 entries, so Nordic buckets stay tight —
// the NST vocabulary is so large that generous caps balloon the output file
// (60/120 produced an 11.5 MB sv.json; 40/80 keeps it manageable).
const NORDIC_RHYME_CAP = 40;
const NORDIC_NEAR_CAP = 80;

function buildNordic(pron, freq, synonyms) {
    const rhymeBuckets = new Map();
    const nearBuckets = new Map();
    const keyOf = new Map();

    for (const [word, trans] of pron) {
        const keys = nstKeys(trans);
        if (!keys) continue;
        keyOf.set(word, keys);
        push(rhymeBuckets, keys.rhyme, word);
        // Assonance over a whole vocabulary is dominated by monosyllabic function
        // words once frequency-ranked ("hjärta" near -> vi/de/men), which is true
        // but musically useless. Longer words keep the mode about vowel colour.
        if (word.length >= 4) push(nearBuckets, keys.near, word);
    }

    const byFrequency = (a, b) =>
        (freq.get(b) || 0) - (freq.get(a) || 0) || a.length - b.length || a.localeCompare(b);

    const trim = (buckets, cap) => {
        const out = {};
        for (const [key, bucket] of buckets) {
            if (bucket.length < 2) continue;
            out[key] = bucket.sort(byFrequency).slice(0, cap);
        }
        return out;
    };

    const rhyme = trim(rhymeBuckets, NORDIC_RHYME_CAP);
    const near = trim(nearBuckets, NORDIC_NEAR_CAP);

    // The runtime resolves a query word's phonetic key by finding the word in a
    // bucket — but a common word can be ranked out of its own oversubscribed
    // bucket ("sommar" fell outside the 'O'-assonance cap and could no longer
    // look itself up at all). Ship explicit keys for every corpus-frequent word
    // so lookup never depends on surviving a cap. Bucketed words are covered by
    // the reverse index; this map only needs the frequent ones.
    const keys = {};
    for (const word of freq.keys()) {
        const k = keyOf.get(word);
        if (k) keys[word] = [k.rhyme, k.near];
    }

    const syn = {};
    for (const [word, set] of synonyms) {
        // Only keep synonyms the pronunciation lexicon can vouch for as real words.
        const vetted = [...set].filter(s => pron.has(s));
        if (vetted.length) syn[word] = vetted.sort(byFrequency).slice(0, SYNONYM_CAP);
    }

    // Syllable counts only for displayable words, and only where the phonetic
    // count DIFFERS from the orthographic vowel-run count the runtime falls back
    // to. Nordic spelling is regular enough that they almost always agree, so
    // storing every count tripled the file for information the runtime could
    // derive itself. This loop must mirror countSyllables in lib/lexicon/index.ts
    // exactly — the store-only-differences trick is only correct if both sides
    // compute the same fallback.
    const naiveSyllables = (word) => {
        const vowels = 'aeiouyåäöæø';
        let count = 0;
        let inRun = false;
        for (const ch of word) {
            const isVowel = vowels.includes(ch);
            if (isVowel && !inRun) count++;
            inRun = isVowel;
        }
        return Math.max(1, count);
    };
    const displayed = new Set();
    Object.values(rhyme).forEach(list => list.forEach(w => displayed.add(w)));
    Object.values(near).forEach(list => list.forEach(w => displayed.add(w)));
    Object.values(syn).forEach(list => list.forEach(w => displayed.add(w)));
    Object.keys(syn).forEach(w => displayed.add(w));
    const syllables = {};
    for (const word of displayed) {
        const trans = pron.get(word);
        if (!trans) continue;
        const phonetic = nstSyllables(trans);
        if (phonetic !== naiveSyllables(word)) syllables[word] = phonetic;
    }

    return { rhyme, near, syn, syllables, keys };
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

function push(map, key, value) {
    const bucket = map.get(key);
    if (bucket) bucket.push(value);
    else map.set(key, [value]);
}

/**
 * WordNet only catalogues open-class words (nouns, verbs, adjectives, adverbs), so
 * using it alone as the "real English word" filter silently drops the closed class:
 * pronouns and their compounds ("anything", "everybody"), modals ("could"), and the
 * irregular verb forms a lyric actually contains ("said", "gone", "knew"). Those are
 * some of the most rhyme-searched words in songwriting — "anything" returning no
 * rhymes at all is how this list came to exist. Each entry still needs a CMUdict
 * pronunciation to be indexed; this only opens the vocabulary door.
 */
const FUNCTION_WORDS = [
    // Pronouns and their compounds
    'me', 'my', 'mine', 'myself', 'you', 'your', 'yours', 'yourself',
    'we', 'us', 'our', 'ours', 'ourselves', 'they', 'them', 'their', 'theirs', 'themselves',
    'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself',
    'who', 'whom', 'whose', 'this', 'that', 'these', 'those',
    'anything', 'everything', 'something', 'nothing',
    'anyone', 'everyone', 'someone', 'anybody', 'everybody', 'somebody', 'nobody',
    'anywhere', 'everywhere', 'somewhere', 'nowhere', 'somehow', 'anyway',
    // Auxiliaries and modals
    'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'do', 'does', 'did', 'done', 'have', 'has', 'had', 'having',
    'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'ought',
    // Conjunctions, prepositions, particles
    'the', 'and', 'but', 'nor', 'if', 'then', 'than', 'when', 'where', 'why', 'how',
    'what', 'which', 'while', 'because', 'though', 'although', 'unless', 'until', 'till',
    'since', 'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around',
    'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'into', 'onto',
    'over', 'under', 'upon', 'within', 'without', 'through', 'during', 'again', 'away',
    'here', 'there', 'never', 'always', 'often', 'once', 'twice', 'from', 'with', 'for', 'not',
    // Irregular verb forms a songwriter clicks on in a finished line
    'said', 'made', 'went', 'gone', 'came', 'knew', 'known', 'took', 'taken', 'gave', 'given',
    'got', 'gotten', 'told', 'kept', 'left', 'felt', 'found', 'brought', 'thought', 'bought',
    'caught', 'taught', 'stood', 'understood', 'heard', 'held', 'meant', 'met', 'paid',
    'ran', 'sang', 'sung', 'sat', 'saw', 'seen', 'sent', 'spoke', 'spoken', 'spent',
    'wore', 'worn', 'won', 'wrote', 'written', 'broke', 'broken', 'chose', 'chosen',
    'drew', 'drawn', 'drove', 'driven', 'fell', 'fallen', 'flew', 'flown', 'forgot',
    'forgotten', 'froze', 'frozen', 'grew', 'grown', 'hid', 'hidden', 'led', 'lost',
    'rose', 'risen', 'shone', 'shown', 'slept', 'sold', 'stole', 'stolen', 'struck',
    'threw', 'thrown', 'woke', 'woken',
];

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

        // Prefer the last STRESSED vowel — primary or secondary; fall back to the
        // last vowel so unstressed monosyllables still rhyme with each other.
        // Secondary stress matters: compounds carry it on the syllable that
        // actually rhymes ("anything" is EH1..IH2-NG, "heartbreak" AA1..EY2-K).
        // Keying on primary stress alone filed those under their FIRST syllable,
        // into single-word buckets the trim below then deleted — so the most
        // common compound words had no rhymes at all.
        const stressed = vowelPositions.filter(i => /[12]$/.test(phonemes[i]));
        const from = (stressed.length ? stressed : vowelPositions)[
            (stressed.length ? stressed : vowelPositions).length - 1
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
        { code: 'sv', thesaurus: 'th_sv_SE.dat', freqFile: 'sv_50k.txt' },
        { code: 'no', thesaurus: 'th_nb_NO.dat', freqFile: 'no_50k.txt' },
    ];

    for (const { code, thesaurus, freqFile } of languages) {
        const pronFile = ensureNstFile(code);
        process.stdout.write(`[lexicon] ${code}: reading NST pronunciations… `);
        const pron = await parseNstPron(pronFile);
        process.stdout.write(`${pron.size.toLocaleString()} forms\n`);

        const freq = parseFrequency(join(ROOT, 'vendor', 'lexicon', 'freq', freqFile));
        const synonyms = parseThesaurus(join(ROOT, 'vendor', 'lexicon', thesaurus));
        const data = buildNordic(pron, freq, synonyms);

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
    // Closed-class words WordNet doesn't carry. The floor of 6 stands in for the
    // sense-count commonness signal they never got: these are among the most
    // frequent words in the language, and without it they'd sort behind every
    // rare-but-catalogued word and risk being trimmed out of full buckets.
    for (const word of FUNCTION_WORDS) {
        vocabulary.set(word, Math.max(vocabulary.get(word) || 0, 6));
    }
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
