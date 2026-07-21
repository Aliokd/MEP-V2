import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const contentType = request.headers.get('content-type') || '';
        let rawBuffer: ArrayBuffer | null = null;

        if (contentType.includes('application/json')) {
            const { audioUrl } = await request.json();
            if (!audioUrl) {
                return NextResponse.json({ error: 'No audioUrl received in JSON body' }, { status: 400 });
            }
            // Fetch audio on the server side (bypassing CORS)
            const fetchUrl = audioUrl.startsWith('blob:') ? audioUrl : audioUrl;
            const audioResponse = await fetch(fetchUrl);
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

        const modelsToTry = [
            'gemini-1.5-flash',
            'gemini-2.0-flash-lite-preview-02-05',
            'gemini-flash-lite-latest',
            'gemini-1.5-pro',
            'gemini-2.0-flash',
        ];

        let transcript = '';
        let lastErrorMessage = '';

        for (const model of modelsToTry) {
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const apiRes = await fetch(geminiUrl, {
                    method: 'POST',
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
                            temperature: 0.1,
                            maxOutputTokens: 2000
                        }
                    })
                });

                if (apiRes.ok) {
                    const result = await apiRes.json();
                    const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
                    if (text && text !== 'NO_SPEECH') {
                        transcript = text;
                        break;
                    } else if (text === 'NO_SPEECH') {
                        transcript = '';
                        break;
                    }
                } else {
                    const errText = await apiRes.text();
                    lastErrorMessage = `Model ${model} HTTP ${apiRes.status}: ${errText.slice(0, 150)}`;
                    console.warn(`[Transcribe] ${lastErrorMessage}`);
                }
            } catch (modelErr: any) {
                lastErrorMessage = `Model ${model} network error: ${modelErr.message}`;
                console.warn(`[Transcribe] ${lastErrorMessage}`);
            }
        }

        return NextResponse.json({ text: transcript, error: transcript ? null : lastErrorMessage });
    } catch (error: any) {
        console.error('Transcription API error:', error);
        return NextResponse.json({ text: '', error: error.message }, { status: 500 });
    }
}
