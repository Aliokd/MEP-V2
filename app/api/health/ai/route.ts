import { NextResponse } from 'next/server';
import { GEMINI_AUDIO_MODELS, GEMINI_VISION_MODELS, GEMINI_TEXT_MODELS } from '@/lib/geminiModels';
import { rateLimitGuard } from '@/lib/rateLimit';

/**
 * Dependency health check for the AI features.
 *
 * Exists because the deployed environment differs from local in ways that are
 * invisible from a developer machine — env vars arrive by a different route,
 * outbound network is a Cloud Function's rather than a laptop's, and the bundle
 * is memory-limited. Diagnosing "transcription is broken" by guesswork costs a
 * round trip per hypothesis; this answers it in one request, from inside the
 * environment that is actually failing.
 *
 * Deliberately NOT behind requireUser. Authentication itself is one of the things
 * that can break, and a health check you cannot reach when auth is down is
 * useless precisely when it matters. The trade is acceptable because the response
 * carries no secrets and no user data — only whether each dependency answers.
 * It is rate limited to keep it from being used as a free upstream prober.
 *
 *   GET /api/health/ai
 */

export const dynamic = 'force-dynamic';

interface Check {
    name: string;
    ok: boolean;
    detail: string;
    ms?: number;
}

async function timed(name: string, fn: () => Promise<string>): Promise<Check> {
    const started = Date.now();
    try {
        const detail = await fn();
        return { name, ok: true, detail, ms: Date.now() - started };
    } catch (error: any) {
        return {
            name,
            ok: false,
            detail: error?.message?.slice(0, 200) || String(error).slice(0, 200),
            ms: Date.now() - started,
        };
    }
}

export async function GET(request: Request) {
    const throttled = rateLimitGuard(request, 'health');
    if (throttled) return throttled;

    const apiKey = process.env.GEMINI_API_KEY;
    const checks: Check[] = [];

    // Presence and a fingerprint — never the key, and never part of it. The
    // fingerprint exists to answer "is the deployed secret the key I think it is?",
    // which matters because production reads GEMINI_API_KEY from CI secrets rather
    // than from any file in the repo, so it can silently differ from local. Compare
    // it against `npm run key:fingerprint` run locally.
    const { createHash } = await import('node:crypto');
    checks.push({
        name: 'gemini_api_key',
        ok: Boolean(apiKey),
        detail: apiKey
            ? `present (${apiKey.length} chars, fingerprint ${createHash('sha256').update(apiKey).digest('hex').slice(0, 12)})`
            : 'MISSING — set GEMINI_API_KEY in the deployed environment',
    });

    // Can this environment reach Google at all, and are our pinned models real?
    if (apiKey) {
        checks.push(
            await timed('gemini_models_reachable', async () => {
                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${apiKey}`,
                    { signal: AbortSignal.timeout(10_000) },
                );
                if (!res.ok) throw new Error(`models.list returned HTTP ${res.status}`);
                const body = await res.json();
                const available = new Set(
                    (body.models || []).map((m: any) => String(m.name).replace('models/', '')),
                );
                const wanted = [
                    ...new Set([...GEMINI_AUDIO_MODELS, ...GEMINI_VISION_MODELS, ...GEMINI_TEXT_MODELS]),
                ];
                const missing = wanted.filter(m => !available.has(m));
                if (missing.length) throw new Error(`pinned models unavailable: ${missing.join(', ')}`);
                return `all ${wanted.length} pinned models available`;
            }),
        );
    }

    // Non-Google egress. A Cloud Function's outbound networking is not a laptop's,
    // and English rhymes depend entirely on this host being reachable.
    checks.push(
        await timed('datamuse_reachable', async () => {
            const res = await fetch('https://api.datamuse.com/words?rel_rhy=test&max=1', {
                signal: AbortSignal.timeout(10_000),
            });
            if (!res.ok) throw new Error(`Datamuse returned HTTP ${res.status}`);
            return 'reachable';
        }),
    );

    // The Nordic indexes are multi-megabyte JSON imports; if the bundle is missing
    // them or the function runs out of memory parsing them, it surfaces here rather
    // than as an unexplained failure mid-lookup.
    for (const lang of ['sv', 'no'] as const) {
        checks.push(
            await timed(`lexicon_data_${lang}`, async () => {
                const { lookup } = await import('@/lib/lexicon');
                const probe = lang === 'sv' ? 'hjärta' : 'hjerte';
                const results = await lookup(probe, 'rhyme', lang);
                if (results.length === 0) throw new Error(`loaded but no rhymes for "${probe}"`);
                return `loaded, ${results.length} rhymes for "${probe}"`;
            }),
        );
    }

    // Token verification needs Google's public certs. If this host cannot fetch
    // them, every authenticated AI route returns 401 no matter what the client does.
    checks.push(
        await timed('firebase_admin_auth', async () => {
            const { adminAuth } = await import('@/lib/firebaseAdmin');
            try {
                await adminAuth.verifyIdToken('not-a-real-token');
            } catch (error: any) {
                // Expected: rejection proves the verifier ran. A credentials or
                // network failure would present as a different class of error.
                const message = String(error?.message || '');
                if (/credential|ADC|default credentials|ENOTFOUND|ETIMEDOUT/i.test(message)) {
                    throw new Error(`verifier cannot initialise: ${message.slice(0, 120)}`);
                }
                return 'verifier reachable (rejected a bogus token as expected)';
            }
            throw new Error('verifier accepted an invalid token');
        }),
    );

    const healthy = checks.every(c => c.ok);

    return NextResponse.json(
        {
            healthy,
            checkedAt: new Date().toISOString(),
            runtime: {
                node: process.version,
                region: process.env.FUNCTION_REGION || process.env.GOOGLE_CLOUD_REGION || 'unknown',
                heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                heapTotalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            },
            checks,
        },
        { status: healthy ? 200 : 503 },
    );
}
