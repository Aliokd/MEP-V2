import { NextResponse } from 'next/server';
import { featureGuard } from '@/lib/featureFlags';
import { GEMINI_AUDIO_MODELS } from '@/lib/geminiModels';
import { requireUser } from '@/lib/apiAuth';
import { rateLimitGuard, withGeminiRetry, quotaError, createCallBudget } from '@/lib/rateLimit';
import { fetchAllowedUrl, vetRemoteUrl } from '@/lib/safeRemoteUrl';

export async function POST(request: Request) {
    // Kill switch: an admin can disable this endpoint from the console
    // without a deploy (see lib/featureFlags.ts).
    const disabled = await featureGuard('transcribe');
    if (disabled) return disabled;

    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;

    // Audio is the most expensive input Gemini bills for, so cap how fast any one
    // account can spend (see lib/rateLimit.ts).
    const throttled = rateLimitGuard(request, 'transcribe', auth.uid);
    if (throttled) return throttled;

    try {
        const contentType = request.headers.get('content-type') || '';
        let rawBuffer: ArrayBuffer | null = null;

        if (contentType.includes('application/json')) {
            const { audioUrl } = await request.json();
            if (!audioUrl) {
                return NextResponse.json({ error: 'No audioUrl received in JSON body' }, { status: 400 });
            }
            // Vetted against an allowlist rather than fetched as given. This used to
            // pass the caller's string straight to fetch(), which is the same SSRF
            // that was closed in /api/download-audio and /api/classify-instrument and
            // missed here: a signed-in user could point the server at the cloud
            // metadata service or anything else reachable from inside the VPC.
            // See lib/safeRemoteUrl.ts.
            const vetted = vetRemoteUrl(audioUrl);
            if (!vetted.ok) {
                return NextResponse.json({ error: vetted.reason || 'That audio url is not allowed' }, { status: 400 });
            }
            // Generous timeout: this is a Storage read from inside the same cloud, but
            // a whole song still has to come across before the model can start.
            const audioResponse = await fetchAllowedUrl(vetted.url!, { timeoutMs: 20_000 });
            if (!audioResponse.ok) {
                throw new Error(`Failed to fetch audio from remote URL: ${audioResponse.statusText}`);
            }
            rawBuffer = await audioResponse.arrayBuffer();
        } else {
            rawBuffer = await request.arrayBuffer();
        }

        if (!rawBuffer || rawBuffer.byteLength === 0) {
            return NextResponse.json({ error: 'No audio data received' }, { status: 400 });
        }

        const buffer = Buffer.from(rawBuffer);
        const audioBytes = buffer.toString('base64');

        // Detect MIME type using magic bytes or Content-Type header fallback
        let mimeType = request.headers.get('content-type') || '';
        if (!mimeType || mimeType.includes('octet-stream') || mimeType.includes('json')) {
            const first4Hex = buffer.toString('hex', 0, Math.min(4, buffer.length)).toUpperCase();
            const first8Hex = buffer.toString('hex', 0, Math.min(8, buffer.length)).toUpperCase();
            
            if (first4Hex === '1A45DFA3') {
                mimeType = 'audio/webm';
            } else if (first4Hex === '52494646') {
                mimeType = 'audio/wav';
            } else if (first4Hex === '494433' || first4Hex.startsWith('FFF')) {
                mimeType = 'audio/mp3';
            } else if (first8Hex.includes('66747970') || first4Hex === '00000014' || first4Hex === '00000018' || first4Hex === '00000020') {
                mimeType = 'audio/mp4';
            } else if (buffer.toString('utf8', 0, 4) === 'OggS') {
                mimeType = 'audio/ogg';
            } else {
                mimeType = 'audio/wav'; // default fallback
            }
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn("GEMINI_API_KEY is not configured.");
            return NextResponse.json({ error: 'GEMINI_API_KEY missing' }, { status: 500 });
        }

        const url = new URL(request.url);
        const lang = url.searchParams.get('lang') || request.headers.get('x-language') || 'en';
        let languageName = 'English';
        if (lang === 'sv') {
            languageName = 'Swedish';
        } else if (lang === 'no') {
            languageName = 'Norwegian';
        }

        const prompt = `Transcribe the audio accurately. The spoken language is strictly ${languageName}. Do NOT translate the words to English. The transcription output must be in ${languageName} only. Do not mix English words into the transcription unless the speaker literally said an English word. Output ONLY the transcription text, nothing else. If there is no speech or only background noise, return NO_SPEECH.`;

        const modelsToTry = GEMINI_AUDIO_MODELS;

        let transcript = '';
        let lastErrorMessage = '';

        // Shared across all three models so they can't stack up past the platform's
        // own request timeout — see createCallBudget for why that matters.
        // Minutes of audio take far longer to transcribe than a page takes to OCR, and
        // non-English speech regularly needs the second model too (the first returns
        // NO_SPEECH more often on Norwegian/Swedish), so per-attempt time matters.
        //
        // HARD CEILING — read before raising these: requests reach this function
        // through Firebase Hosting's CDN, whose backend rewrites time out at ~60
        // seconds no matter what frameworksBackend.timeoutSeconds says. A previous
        // fix set this budget to 100s trusting the function's 120s ceiling; the
        // function then reliably outlived the edge cutoff, the CDN answered with
        // its own non-JSON error page, and every long transcription surfaced as a
        // contentless "Transcription failed" — the exact failure the budget exists
        // to prevent. The entire request (upload included, which shares the same
        // 60s window) must finish inside it: 40s total leaves upload headroom, and
        // 32s per attempt buys one genuinely long attempt plus a short fallback
        // rather than two truncated ones.
        const budget = createCallBudget(40_000, 32_000);

        for (const model of modelsToTry) {
            const signal = budget.next();
            if (!signal) {
                lastErrorMessage = 'Transcription took too long. Please try again.';
                console.warn('[Transcribe] Time budget spent; skipping remaining models.');
                break;
            }
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                // A 429 here is transient — even the paid tier's per-minute cap can be
                // clipped by a burst — so back off and retry before giving up on this model.
                const apiRes = await withGeminiRetry(async () => {
                    const attempt = await fetch(geminiUrl, {
                    method: 'POST',
                    signal,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        inlineData: {
                                            mimeType: mimeType,
                                            data: audioBytes
                                        }
                                    },
                                    { text: prompt }
                                ]
                            }
                        ],
                        generationConfig: {
                            // Room for a long transcript plus the reasoning tokens a
                            // thinking model spends first. A ceiling, not a reservation.
                            maxOutputTokens: 4096
                        }
                    })
                    });
                    if (attempt.status === 429) throw quotaError('Gemini rate limited');
                    return attempt;
                });

                if (apiRes.ok) {
                    const result = await apiRes.json();
                    const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
                    if (text && text !== 'NO_SPEECH') {
                        transcript = text;
                        break;
                    }
                    // NO_SPEECH (or empty) from this model isn't final — a weaker/faster
                    // model can miss real speech that a later model in the list catches.
                    // Only conclude "no speech" once every model has been tried.
                } else {
                    const errText = await apiRes.text();
                    lastErrorMessage = `Model ${model} HTTP ${apiRes.status}: ${errText.slice(0, 150)}`;
                    console.warn(`[Transcribe] ${lastErrorMessage}`);
                }
            } catch (modelErr: any) {
                // A timeout is the budget cutting the attempt off, not a model failure —
                // say so plainly rather than surfacing a raw abort message.
                lastErrorMessage =
                    modelErr?.name === 'TimeoutError' || modelErr?.name === 'AbortError'
                        ? 'Transcription took too long. Please try again.'
                        : `Model ${model} network error: ${modelErr.message}`;
                console.warn(`[Transcribe] ${lastErrorMessage}`);
            }
        }

        if (transcript) {
            return NextResponse.json({ text: transcript, error: null });
        }
        // Distinguish "the models genuinely heard no speech" (an answer — 200 with
        // empty text, the client says so) from "the attempt failed" (an error — the
        // client must show the reason, not pretend the recording was silent).
        // Both used to come back as 200, so a timeout read as "no lyrics found".
        if (lastErrorMessage) {
            return NextResponse.json(
                {
                    text: '',
                    error: lastErrorMessage.startsWith('Transcription took too long')
                        ? 'This recording is too long to transcribe in one go. Try a shorter clip.'
                        : lastErrorMessage,
                },
                { status: 504 },
            );
        }
        return NextResponse.json({ text: '', error: null });
    } catch (error: any) {
        console.error('Transcription API error:', error);
        return NextResponse.json({ text: '', error: error.message }, { status: 500 });
    }
}
