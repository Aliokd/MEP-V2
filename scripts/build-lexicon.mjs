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

async function expandWordList(pkg) {
    const aff = join(ROOT, 'node_modules', pkg, 'index.aff');
    const dic = join(ROOT, 'node_modules', pkg, 'index.dic');
    const reader = await IterableHunspellReader.createFromFiles(aff, dic);

    const words = new Set();
    for (const raw of reader.iterateWords()) {
        const word = String(raw).trim().toLowerCase();
        if (WORD_RE.test(word)) words.add(word);
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
}

main().catch(err => {
    console.error('[lexicon] build failed:', err);
    process.exit(1);
});
