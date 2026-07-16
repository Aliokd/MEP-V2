import { GoogleAuth } from 'google-auth-library';
import { NextResponse } from 'next/server';

const credentialsJson = {
  type: "service_account",
  project_id: "mep-v2",
  private_key_id: "8251fd3fe7e55cc0833b825f697b6f11a92b5751",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDNs/6r+/zbDQnf\nGk4b3nhXs8qwtCOkTSBXT1ldDpa9PalJV4L+5WmhxGm0rEeEMW/DlSyMyUauHAW1\npWovVGZbLAIsWtB5ueXm7Vr1QqsbXzOkdp+JBHZyJbWQGE//GJ3rHwon9mD387tU\na0mSD9tI89g/7XV2bM9VsjDtQG0MVfx7HepUkGigQycEaZ7b31UEDGFmE5c9Ia81\nFp3F2JBJGYjpTypXIoJXL08ykFfPMvs/NDDDSKgm6Aa8YrIqVdxNKOnG9O1BChSY\nhbI2sjrBhE4KOFMM6oCzT1RhMq9LsmqYIVCyuEc8kfxhrXFZ+USQTRR5gXVCzuX+\njufYBgThAgMBAAECggEACjlzo6XLTDIKNxIuJrl4ntdbcEwL53tD68MQbI0wlehu\nNSyJ4NSTWwyRun7DsUDpzr1n8PmCL15KNFyr+f1GdyqpUv4SlbJVSJSsrDsrmRky\nzm5tAJj9sC/KpgZnV4UoOEsbLKBU8o4lVg1dI0rxed9Q9OB/Mas35QkN4IUOxoma\nyiq/wNvz5gFwoxZKuQXN675frbAO8VI1CUkByYgDzB7tkk1YT478UWmWZhaXQmSY\nmAwVxAtxMsgZfuHWXryLgVrePQeu91e2ePBfLxYo3MGSVEhvuzAScSxnux6sSpua\nAZ1pI1RY/tlkrf6cJTGSJkrgMBH6NDpNkpOoWUgxZwKBgQDoQSIC0kMU8CYG1f1a\nyLRV6drjGIPFxTyoZEdRJLc7tyYpkMCdaU57MM340lBP59iDnKjJHg8EP55NpAcG\nc0l3mlU/HyxwVh5sz9VjMXZOSVzQDBgbmnxz9TboPCO1wtDBf1KPoL2D/JqbyNPl\nTWc2OJE9I/9H+dFKjZhZ3KWpFwKBgQDiu+0Ot0EMBOIscF0dCAGf2Zw4yYP7AvGw\nwzXt7ZKMteMM45/o2Fm3MdyJ6nKdONIybVOVN1fMhAwgrOb8u7snXlrUlwzSBroA\nnZhylbDd0b/oGQV00HnJ2FEDYpmwdxb5M0JMOwDoA3ZfgXJ31AJy8igtE9/pIiDe\nmqLJKdGMxwKBgDOQMlLaB5agcnDWFXeQU6k3UCdXC/pefccM7GBxfFS/prNXtcu8\n03W6MiBp4Pa8jG872qU8DS1uSmEGZ6Dg+5CYLRDkhOMz23Fg+wkYtCFRXE+8P6Xx\nOGwuJtCMeYkjBWHQOK42i5y/+jtX7ONdueppyKUAVu7N4c9hfE+HEyhlAoGAZHik\nHn5EG8BaPRj5mfC/T4dNe7iIfIWcdhi64BkDdMjwuPhxFuwwLUayFIdIjLTuKBxc\nCmZAyMbG3P/hR6Mk1tgv5b6dlsAWUkmDkVsVyeW1ZXMZAN+U6EWr+JULx6+uBXWa\nbk9DIozOOpoREFppT2hRN1B0S0mtSRc7BWs7iWcCgYEApB+BYJfMZpsU9dLZxiKZ\nefGxaTASOpW53uGhlJUReg2bcE8F8Knl7CkwATo0SrUbr5FOOnOsIDS717U4K4wY\n4fCgqUMmND1VLRZd4cbS9uksFK9x+79D2kai77B8FsOB5NSLZSDAr6VZ9/awIB6o\ntq2lZ/jad04fu3rVm0rBfPg=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@mep-v2.iam.gserviceaccount.com",
  client_id: "103281381125574326190",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40mep-v2.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

const auth = new GoogleAuth({
    credentials: credentialsJson,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
});


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
            // No GCP credentials available – return empty transcription
            // (the user can type the lyrics manually)
            return NextResponse.json({ text: '', isMock: true });
        }

        const speechConfig: any = {
            encoding: encoding,
            languageCode: 'en-US',
        };
        if (encoding === 'WEBM_OPUS') {
            speechConfig.audioChannelCount = 2;
        }
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
        console.error('Transcription API error:', error);
        // Return empty transcription on error so the user can type manually
        return NextResponse.json({ text: '', isMock: true });
    }
}

