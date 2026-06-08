import { GoogleAuth } from 'google-auth-library';
import { NextResponse } from 'next/server';

const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

export async function POST(request: Request) {
    try {
        const audioBuffer = await request.arrayBuffer();
        if (!audioBuffer || audioBuffer.byteLength === 0) {
            return NextResponse.json({ error: 'No audio data received' }, { status: 400 });
        }

        const audioBytes = Buffer.from(audioBuffer).toString('base64');
        const token = await auth.getAccessToken();
        
        if (!token) {
            throw new Error('Failed to retrieve Google access token');
        }

        const response = await fetch('https://speech.googleapis.com/v1/speech:recognize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                config: {
                    encoding: 'LINEAR16',
                    sampleRateHertz: 16000,
                    languageCode: 'en-US',
                },
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
        console.error('Transcription error details:', error);
        return NextResponse.json({ 
            error: error.message || 'Unknown error during transcription',
            details: JSON.stringify(error)
        }, { status: 500 });
    }
}
