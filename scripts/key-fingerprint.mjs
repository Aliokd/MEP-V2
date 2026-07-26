/**
 * Prints a fingerprint of the local GEMINI_API_KEY, never the key itself.
 *
 *   npm run key:fingerprint
 *
 * Production reads GEMINI_API_KEY from CI secrets, not from any file in this repo,
 * so the deployed value can silently differ from the one you develop against — a
 * stale or wrong key looks identical to a quota problem from the outside.
 * Compare this fingerprint with the one reported by GET /api/health/ai to tell
 * those apart in one step.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

function readLocalKey() {
    for (const file of ['.env.local', '.env']) {
        if (!existsSync(file)) continue;
        const match = readFileSync(file, 'utf8').match(/^GEMINI_API_KEY=(.*)$/m);
        if (match) {
            return { key: match[1].trim().replace(/^["']|["']$/g, ''), file };
        }
    }
    return null;
}

const found = readLocalKey();

if (!found?.key) {
    console.error('No GEMINI_API_KEY found in .env.local or .env');
    process.exit(1);
}

const fingerprint = createHash('sha256').update(found.key).digest('hex').slice(0, 12);

console.log(`source      : ${found.file}`);
console.log(`length      : ${found.key.length} chars`);
console.log(`fingerprint : ${fingerprint}`);
console.log('\nCompare against the gemini_api_key line from GET /api/health/ai.');
console.log('Same fingerprint  -> production has this exact key.');
console.log('Different         -> the CI secret holds a different key; that is the bug.');
