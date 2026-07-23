import { NextResponse } from 'next/server';

async function extractPdfTextViaGemini(buffer: Buffer): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('PDF extraction requires GEMINI_API_KEY to be configured');
  }

  const base64Data = buffer.toString('base64');
  const prompt = `Extract ALL text content from this PDF document exactly as written, including lyrics, headers, and titles.
Preserve exact line breaks and paragraph structure.
Do NOT correct spelling, do NOT translate, and do NOT add markdown wrappers or conversational intro/outro text.
If the PDF has no extractable text at all, output EXACTLY: NO_TEXT`;

  // Local PDF-parsing libraries (pdf-parse v2 needs pdfjs-dist's worker setup, which Turbopack
  // can't statically bundle for the deployed Cloud Function; pdf-parse v1's vendored parser is
  // too old to reliably handle PDFs from real-world producers) proved unreliable in this exact
  // deployment. Routing through Gemini instead — same approach already proven reliable for
  // image OCR — avoids the local-parser/bundler problem entirely.
  const modelsToTry = [
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-3.5-flash-lite',
  ];

  let extractedText: string | null = null;
  let anyModelResponded = false;
  let isQuotaError = false;
  let lastErrorText = '';

  for (const model of modelsToTry) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType: 'application/pdf', data: base64Data } },
                { text: prompt }
              ]
            }
          ],
          generationConfig: { maxOutputTokens: 8192 }
        })
      });

      if (response.ok) {
        anyModelResponded = true;
        const result = await response.json();
        const text = (result.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
        if (text && text !== 'NO_TEXT') {
          extractedText = text;
          break;
        }
        // NO_TEXT (or empty) from this model isn't final — a weaker/faster model can
        // miss text a later model catches. Only conclude "no text" once all models are tried.
      } else {
        lastErrorText = await response.text();
        if (response.status === 429) isQuotaError = true;
      }
    } catch (err: any) {
      lastErrorText = err.message || String(err);
    }
  }

  if (extractedText !== null) return extractedText;
  if (anyModelResponded) return ''; // every model agreed there's no text — a normal result
  if (isQuotaError) throw new Error('AI extraction quota temporarily exceeded. Please try again in a few moments.');
  throw new Error(`PDF extraction failed. ${lastErrorText}`);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();
    let extractedText = '';

    if (fileName.endsWith('.pdf')) {
      extractedText = await extractPdfTextViaGemini(buffer);
    } else if (fileName.endsWith('.docx')) {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || '';
    } else if (fileName.endsWith('.doc')) {
      // Old word doc fallback: extract printable character sequences from binary representation
      const rawText = buffer.toString('binary');
      const matches = rawText.match(/[\x20-\x7E\xA0-\xFF\x0A\x0D]{4,}/g);
      extractedText = matches ? matches.join('\n') : '';
    } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      extractedText = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    return NextResponse.json({ text: extractedText.trim() });
  } catch (error: any) {
    console.error("Text extraction failed:", error);
    return NextResponse.json({ error: error.message || 'Text extraction failed' }, { status: 500 });
  }
}
