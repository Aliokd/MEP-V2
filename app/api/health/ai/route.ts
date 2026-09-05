import { NextResponse } from 'next/server';
import { GEMINI_AUDIO_MODELS, GEMINI_VISION_MODELS, GEMINI_TEXT_MODELS } from '@/lib/geminiModels';
import { rateLimitGuard } from '@/lib/rateLimit';
import { COLLAB_EMAIL_INVITES_ENABLED } from '@/lib/uiFlags';

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
    /**
     * A failure that is known, accepted, and already contained in code — it is
     * reported and listed under `degraded`, but does not make the endpoint 503.
     *
     * This exists so the gate keeps meaning something. The deploy workflow fails
     * on a 503, so a fault nobody intends to fix this week would paint every
     * subsequent run red, and a permanently red gate is one people stop reading —
     * which is exactly how the outages this endpoint was written for went
     * unnoticed. Anything genuinely broken must stay non-advisory.
     */
    advisory?: boolean;
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
            : 'MISSING. Set GEMINI_API_KEY in the deployed environment',
    });

    // Outbound email arrives by the same route as the key above and failed the
    // same way: an unset CI secret wrote an empty value, and every send — welcome
    // mail, support replies, moderation notices — threw before touching the
    // network, silently, for weeks. Presence only: opening a real SMTP connection
    // on a public endpoint would make this a free prober and add a round trip to
    // every call. The live login test lives in the admin console's Ops page.
    const smtpPass = process.env.SMTP_PASS;
    checks.push({
        name: 'smtp_password',
        ok: Boolean(smtpPass),
        // Advisory only while the mail-dependent feature is switched off in code.
        // Inviting someone with no account is refused outright in that state
        // (COLLAB_EMAIL_INVITES_ENABLED), so nothing tells a user an email is on
        // its way when it is not. The remaining flows — welcome, support replies,
        // moderation notices — do still fail silently, which is why this is
        // reported as degraded rather than dropped. Turning invites back on makes
        // it required again automatically, and the endpoint 503s until the secret
        // is set, which is the correct order: the feature must not outrun it.
        advisory: !COLLAB_EMAIL_INVITES_ENABLED,
        detail: smtpPass
            ? `present (${smtpPass.length} chars, fingerprint ${createHash('sha256').update(smtpPass).digest('hex').slice(0, 12)})`
            : COLLAB_EMAIL_INVITES_ENABLED
                ? 'MISSING. No email can be sent. Set SMTP_PASS in the repository secrets.'
                : 'MISSING. No email can be sent (welcome, support replies, moderation notices). Not failing the check because email invitations are disabled in code to match. Set SMTP_PASS in the repository secrets.',
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

    // The lexicon indexes are multi-megabyte JSON imports; if the bundle is missing
    // them or the function runs out of memory parsing them, it surfaces here rather
    // than as an unexplained failure mid-lookup. All three are local — the lexicon
    // no longer depends on any third-party API.
    const probes = { sv: 'hjärta', no: 'hjerte', en: 'heart' } as const;
    for (const lang of ['sv', 'no', 'en'] as const) {
        checks.push(
            await timed(`lexicon_data_${lang}`, async () => {
                const { lookup } = await import('@/lib/lexicon');
                const probe = probes[lang];
                const results = await lookup(probe, 'rhyme', lang);
                if (results.length === 0) throw new Error(`loaded but no rhymes for "${probe}"`);
                return `loaded, ${results.length} rhymes for "${probe}"`;
            }),
        );
    }

    // A garbage token only proves the verifier *runs* — it fails the same way
    // regardless of which project the Admin SDK is configured for, so it cannot
    // catch a project mismatch. verifyIdToken checks a real token's `aud` claim
    // against exactly this project ID; if App Hosting's runtime environment
    // resolves a different one than the client SDK uses, every genuine user
    // token gets rejected as "invalid" while a fake one is rejected identically
    // — which is why this needs its own check rather than reusing the one below.
    const clientProjectId = 'mep-v2';
    checks.push(
        await timed('gemini_project_id_match', async () => {
            // Read the project through our own admin module, never via a direct
            // getApp() on 'firebase-admin/app'. The direct call had an ordering bug
            // (nothing had initialized the default app yet on a cold instance) and,
            // on deployed Hosting, the frameworks harness registers its own named
            // app — both made this check throw for reasons that had nothing to do
            // with a project mismatch. Going through the module guarantees our app
            // exists and that we're reading the same registry every route uses.
            const { adminApp } = await import('@/lib/firebaseAdmin');
            const resolvedProjectId = adminApp.options.projectId;
            if (resolvedProjectId !== clientProjectId) {
                throw new Error(
                    `Admin SDK resolved projectId "${resolvedProjectId}", but the client app uses "${clientProjectId}". ` +
                    `Every real user token will be rejected as invalid. ` +
                    `env: FIREBASE_PROJECT_ID=${process.env.FIREBASE_PROJECT_ID ?? '(unset)'} ` +
                    `GCLOUD_PROJECT=${process.env.GCLOUD_PROJECT ?? '(unset)'} ` +
                    `GOOGLE_CLOUD_PROJECT=${process.env.GOOGLE_CLOUD_PROJECT ?? '(unset)'}`
                );
            }
            return `projectId "${resolvedProjectId}" matches the client app`;
        }),
    );

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

    // Advisory failures are surfaced but do not gate the deploy — see Check.advisory.
    const healthy = checks.every(c => c.ok || c.advisory);
    const degraded = checks.filter(c => !c.ok && c.advisory).map(c => c.name);

    return NextResponse.json(
        {
            healthy,
            // Present only when something is genuinely wrong but deliberately
            // tolerated, so "200 with a degraded list" can never read as "all fine".
            ...(degraded.length ? { degraded } : {}),
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
