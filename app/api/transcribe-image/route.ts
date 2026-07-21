import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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

        const modelsToTry = [
            'gemini-1.5-flash',
            'gemini-2.0-flash-lite-preview-02-05',
            'gemini-flash-lite-latest',
            'gemini-1.5-pro',
            'gemini-2.0-flash'
        ];

        let extractedText: string | null = null;
        let isQuotaError = false;
        let lastErrorText = '';

        for (const model of modelsToTry) {
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const response = await fetch(geminiUrl, {
                    method: 'POST',
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
                            temperature: 0.1,
                            maxOutputTokens: 2048
                        }
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    extractedText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    console.log(`[Image OCR] Successfully scanned image using model: ${model}`);
                    break;
                } else {
                    const errBody = await response.text();
                    lastErrorText = errBody;
                    if (response.status === 429) {
                        isQuotaError = true;
                    }
                    console.warn(`[Image OCR] Model ${model} returned ${response.status}, attempting fallback model...`);
                }
            } catch (err: any) {
                console.warn(`[Image OCR] Failed model ${model}:`, err);
            }
        }

        if (extractedText !== null) {
            return NextResponse.json({ text: extractedText.trim() });
        }

        if (isQuotaError) {
            return NextResponse.json({ 
                error: 'AI scanning quota temporarily exceeded. Please try again in a few moments.',
                isQuotaError: true 
            }, { status: 429 });
        }

        throw new Error(`All OCR models failed. ${lastErrorText}`);
    } catch (error: any) {
        console.error('Error in transcribe-image API:', error);
        return NextResponse.json({ error: error.message || 'Failed to extract text from image' }, { status: 500 });
    }
}
