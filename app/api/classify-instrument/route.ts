import { NextResponse } from 'next/server';

const ALLOWED_INSTRUMENTS = ['guitar', 'piano', 'drums', 'vocals', 'synth', 'custom'] as const;
type Instrument = typeof ALLOWED_INSTRUMENTS[number];

function detectMimeType(buffer: Buffer, contentTypeHeader: string): string {
    if (contentTypeHeader && !contentTypeHeader.includes('octet-stream') && !contentTypeHeader.includes('json')) {
        return contentTypeHeader;
    }
    const first4Hex = buffer.toString('hex', 0, Math.min(4, buffer.length)).toUpperCase();
    const first8Hex = buffer.toString('hex', 0, Math.min(8, buffer.length)).toUpperCase();

    if (first4Hex === '1A45DFA3') return 'audio/webm';
    if (first4Hex === '52494646') return 'audio/wav';
    if (first4Hex === '494433' || first4Hex.startsWith('FFF')) return 'audio/mp3';
    if (first8Hex.includes('66747970')) return 'audio/mp4';
    if (buffer.toString('utf8', 0, 4) === 'OggS') return 'audio/ogg';
    return 'audio/wav';
}

// Classification is a "nice to have" enhancement, never a blocking requirement — any failure
// (missing/invalid API key, network error, an unparseable model response) falls back to the
// generic 'custom' instrument rather than surfacing an error to the caller.
export async function POST(request: Request) {
    try {
        const contentType = request.headers.get('content-type') || '';
        let rawBuffer: ArrayBuffer | null = null;

        if (contentType.includes('application/json')) {
            const { audioUrl } = await request.json();
            if (!audioUrl || typeof audioUrl !== 'string' || audioUrl.startsWith('blob:')) {
                return NextResponse.json({ instrument: 'custom' as Instrument });
            }
            const audioResponse = await fetch(audioUrl);
            if (!audioResponse.ok) {
                return NextResponse.json({ instrument: 'custom' as Instrument });
            }
            rawBuffer = await audioResponse.arrayBuffer();
        } else {
            rawBuffer = await request.arrayBuffer();
        }

        if (!rawBuffer || rawBuffer.byteLength === 0) {
            return NextResponse.json({ instrument: 'custom' as Instrument });
        }

        const buffer = Buffer.from(rawBuffer);
        const mimeType = detectMimeType(buffer, contentType);
        const audioBytes = buffer.toString('base64');

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn("[ClassifyInstrument] GEMINI_API_KEY is not configured.");
            return NextResponse.json({ instrument: 'custom' as Instrument });
        }

        const systemPrompt = `You are an audio classification assistant for a music recording app. Listen to the given audio clip and identify the single dominant instrument or sound source.
Return only valid JSON matching this schema, with no markdown code blocks or wrapper text: {"instrument": "guitar" | "piano" | "drums" | "vocals" | "synth" | "custom"}.
Use "vocals" for singing or speech, "synth" for electronic/synthesized instruments, and "custom" if you cannot confidently identify the instrument or if it doesn't fit the other categories.`;

        // Same fallback chain as the other Gemini routes in this app (transcribe, transcribe-image) —
        // here it's for model *availability* (a given model id can be deprecated/unavailable for a
        // given key/project) rather than accuracy escalation.
        const modelsToTry = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.5-flash-lite'];

        for (const model of modelsToTry) {
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

                // Bound worst-case latency per model attempt — this is a non-critical enhancement,
                // so a slow/hung upstream call must never be allowed to stall the caller indefinitely.
                const apiRes = await fetch(geminiUrl, {
                    method: 'POST',
                    signal: AbortSignal.timeout(10000),
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    { inlineData: { mimeType, data: audioBytes } },
                                    { text: 'Classify the dominant instrument in this audio clip.' }
                                ]
                            }
                        ],
                        systemInstruction: {
                            parts: [{ text: systemPrompt }]
                        },
                        generationConfig: {
                            responseMimeType: 'application/json',
                            temperature: 0.1,
                            maxOutputTokens: 100
                        }
                    })
                });

                if (!apiRes.ok) {
                    const errText = await apiRes.text();
                    console.warn(`[ClassifyInstrument] Model ${model} HTTP ${apiRes.status}: ${errText.slice(0, 150)}`);
                    continue;
                }

                const result = await apiRes.json();
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

                let parsedInstrument: string | null = null;
                try {
                    parsedInstrument = JSON.parse(text)?.instrument ?? null;
                } catch {
                    // unparseable response from this model — try the next one
                    continue;
                }

                if (ALLOWED_INSTRUMENTS.includes(parsedInstrument as Instrument)) {
                    return NextResponse.json({ instrument: parsedInstrument as Instrument });
                }
            } catch (modelErr: any) {
                console.warn(`[ClassifyInstrument] Model ${model} network error: ${modelErr.message}`);
            }
        }

        return NextResponse.json({ instrument: 'custom' as Instrument });
    } catch (error: any) {
        console.error('[ClassifyInstrument] Unexpected error:', error);
        return NextResponse.json({ instrument: 'custom' as Instrument });
    }
}
