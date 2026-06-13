import { GoogleAuth } from 'google-auth-library';
import { NextResponse } from 'next/server';

const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

// Creative fallback lyrics to simulate speech-to-text when GCP credentials are not configured
const MOCK_LYRIC_FALLBACKS = [
    "Dancing in the shadows of the neon light",
    "Searching for a melody to heal the pain",
    "Chasing after dreams that vanish in the night",
    "Walking through the city in the pouring rain",
    "Whispers in the wind are calling out your name",
    "Running from the echoes of a past we lost",
    "Every single heartbeat is a wild refrain",
    "Finding brand new pathways at whatever cost"
];

export async function POST(request: Request) {
    try {
        const contentType = request.headers.get('content-type') || '';
        let rawBuffer: ArrayBuffer;

        if (contentType.includes('application/json')) {
            const { audioUrl } = await request.json();
            if (!audioUrl) {
                return NextResponse.json({ error: 'No audioUrl received in JSON body' }, { status: 400 });
            }
            // Fetch audio on the server side to bypass browser CORS policy
            const audioResponse = await fetch(audioUrl);
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

        // Detect audio container using magic bytes
        const first4Hex = buffer.toString('hex', 0, Math.min(4, buffer.length)).toUpperCase();
        
        let encoding = 'LINEAR16';
        let sampleRateHertz: number | undefined = 16000;

        if (first4Hex === '1A45DFA3') { // WebM magic bytes (EBML header)
            encoding = 'WEBM_OPUS';
            sampleRateHertz = undefined; // Let Google detect sample rate automatically from the WebM header
        } else if (first4Hex === '52494646') { // RIFF magic bytes (WAV header)
            encoding = 'LINEAR16';
            sampleRateHertz = 16000;
        }
        
        let token: string | null | undefined = null;
        try {
            token = await auth.getAccessToken();
        } catch (authError: any) {
            console.warn('Could not load Google Cloud credentials. Falling back to mock transcription.', authError.message);
        }

        if (!token) {
            // Fallback mock transcription response when auth fails
            const line1 = MOCK_LYRIC_FALLBACKS[Math.floor(Math.random() * MOCK_LYRIC_FALLBACKS.length)];
            const line2 = MOCK_LYRIC_FALLBACKS[Math.floor(Math.random() * MOCK_LYRIC_FALLBACKS.length)];
            return NextResponse.json({ text: `${line1}\n${line2}`, isMock: true });
        }

        const speechConfig: any = {
            encoding: encoding,
            languageCode: 'en-US',
        };
        if (sampleRateHertz !== undefined) {
            speechConfig.sampleRateHertz = sampleRateHertz;
        }

        const response = await fetch('https://speech.googleapis.com/v1/speech:recognize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                config: speechConfig,
                audio: {
                    content: audioBytes,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Speech API response error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        const transcription = result.results
            ?.map((res: any) => res.alternatives?.[0]?.transcript)
            .join(' ');

        return NextResponse.json({ text: transcription || '' });
    } catch (error: any) {
        console.error('Transcription API error. Falling back to mock transcription. Details:', error);
        // Fallback mock transcription response when Speech API fails
        const line1 = MOCK_LYRIC_FALLBACKS[Math.floor(Math.random() * MOCK_LYRIC_FALLBACKS.length)];
        const line2 = MOCK_LYRIC_FALLBACKS[Math.floor(Math.random() * MOCK_LYRIC_FALLBACKS.length)];
        return NextResponse.json({ text: `${line1}\n${line2}`, isMock: true });
    }
}

