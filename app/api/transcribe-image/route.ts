import { NextResponse } from 'next/server';
import { featureGuard } from '@/lib/featureFlags';
import { GEMINI_VISION_MODELS } from '@/lib/geminiModels';
import { requireUser } from '@/lib/apiAuth';
import { rateLimitGuard, withGeminiRetry, quotaError, createCallBudget } from '@/lib/rateLimit';

export async function POST(request: Request) {
    // Kill switch: an admin can disable this endpoint from the console
    // without a deploy (see lib/featureFlags.ts).
    const disabled = await featureGuard('transcribe_image');
    if (disabled) return disabled;

    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;

    // Billed per call — cap how fast any one account can spend (see lib/rateLimit.ts).
    const throttled = rateLimitGuard(request, 'transcribe-image', auth.uid);
    if (throttled) return throttled;

    try {
        let imageUrl = '';
        let mimeType = 'image/jpeg';
        let base64Data = '';

        const contentTypeHeader = request.headers.get('content-type') || '';

        if (contentTypeHeader.includes('application/json')) {
            const body = await request.json();
            imageUrl = body.imageUrl || '';
        } else if (contentTypeHeader.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file') as File;
            if (file) {
                const arrayBuffer = await file.arrayBuffer();
                base64Data = Buffer.from(arrayBuffer).toString('base64');
                mimeType = file.type || 'image/png';
                imageUrl = `data:${mimeType};base64,${base64Data}`;
            }
        } else {
            const body = await request.json().catch(() => ({}));
            imageUrl = body.imageUrl || '';
        }

        if (!imageUrl && !base64Data) {
            return NextResponse.json({ error: 'No image provided for OCR scanning' }, { status: 400 });
        }

        if (imageUrl && !base64Data) {
            if (imageUrl.startsWith('data:')) {
                const matches = imageUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
                if (!matches || matches.length < 3) {
                    return NextResponse.json({ error: 'Invalid data URL format' }, { status: 400 });
                }
                mimeType = matches[1];
                base64Data = matches[2];
            } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                const imageResponse = await fetch(imageUrl);
                if (!imageResponse.ok) {
                    throw new Error(`Failed to fetch image from remote URL: ${imageResponse.statusText}`);
                }
                const contentType = imageResponse.headers.get('content-type');
                if (contentType) {
                    mimeType = contentType;
                }
                const arrayBuffer = await imageResponse.arrayBuffer();
                base64Data = Buffer.from(arrayBuffer).toString('base64');
            }
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn("GEMINI_API_KEY is not configured for image OCR.");
            return NextResponse.json({ text: '', isMock: true });
        }

        const prompt = `Perform high-precision OCR on this image.
Extract ALL visible text, lyrics, headers, titles, handwritten or printed text exactly line by line as written in the image.
Preserve exact line breaks and paragraph structure.
Do NOT correct spelling, do NOT translate, and do NOT add markdown wrappers or conversational intro/outro text.
If the image has NO text or lyrics on it at all, output EXACTLY: NO_TEXT`;

        const modelsToTry = GEMINI_VISION_MODELS;

        let extractedText: string | null = null;
        let anyModelResponded = false;
        let isQuotaError = false;
        let timedOut = false;
        let lastErrorText = '';

        // Shared across all three models so they can't stack up past the platform's
        // own request timeout — see createCallBudget for why that matters.
        const budget = createCallBudget();

        for (const model of modelsToTry) {
            const signal = budget.next();
            if (!signal) {
                timedOut = true;
                console.warn('[Image OCR] Time budget spent; skipping remaining models.');
                break;
            }
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                // A 429 here is transient — even the paid tier's per-minute cap can be
                // clipped by a burst — so back off and retry before giving up on this model.
                const response = await withGeminiRetry(async () => {
                    const attempt = await fetch(geminiUrl, {
                    method: 'POST',
                    signal,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        inlineData: {
                                            mimeType: mimeType,
                                            data: base64Data
                                        }
                                    },
                                    {
                                        text: prompt
                                    }
                                ]
                            }
                        ],
                        generationConfig: {
                            // Room for a full page of transcribed text plus the reasoning
                            // tokens a thinking model spends first. A ceiling, not a reservation.
                            maxOutputTokens: 4096
                        }
                    })
                    });
                    if (attempt.status === 429) throw quotaError('Gemini rate limited');
                    return attempt;
                });

                if (response.ok) {
                    anyModelResponded = true;
                    const result = await response.json();
                    const text = (result.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
                    if (text && text !== 'NO_TEXT') {
                        extractedText = text;
                        console.log(`[Image OCR] Successfully scanned image using model: ${model}`);
                        break;
                    }
                    // NO_TEXT (or empty) from this model isn't final — a weaker/faster
                    // model can miss real text that a later model in the list catches.
                    // Only conclude "no text" once every model has been tried.
                } else {
                    const errBody = await response.text();
                    lastErrorText = errBody;
                    if (response.status === 429) {
                        isQuotaError = true;
                    }
                    console.warn(`[Image OCR] Model ${model} returned ${response.status}, attempting fallback model...`);
                }
            } catch (err: any) {
                // TimeoutError/AbortError means the budget cut this attempt off, not
                // that the model rejected the image — worth telling the user apart.
                if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
                    timedOut = true;
                    console.warn(`[Image OCR] Model ${model} timed out.`);
                } else {
                    console.warn(`[Image OCR] Failed model ${model}:`, err);
                }
            }
        }

        if (extractedText !== null) {
            return NextResponse.json({ text: extractedText.trim() });
        }

        if (anyModelResponded) {
            // Every model that responded agreed there's no text — a normal result, not a failure.
            return NextResponse.json({ text: '' });
        }

        if (isQuotaError) {
            return NextResponse.json({
                error: 'AI scanning quota temporarily exceeded. Please try again in a few moments.',
                isQuotaError: true
            }, { status: 429 });
        }

        if (timedOut) {
            // Answered by us, in JSON, rather than letting the platform kill the
            // request and hand the client an unparseable gateway error.
            return NextResponse.json({
                error: 'Scanning took too long. Please try again. A smaller or clearer photo usually helps.',
                isTimeout: true
            }, { status: 504 });
        }

        throw new Error(`All OCR models failed. ${lastErrorText}`);
    } catch (error: any) {
        console.error('Error in transcribe-image API:', error);
        return NextResponse.json({ error: error.message || 'Failed to extract text from image' }, { status: 500 });
    }
}
