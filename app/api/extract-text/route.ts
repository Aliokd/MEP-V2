import { NextResponse } from 'next/server';
import { featureGuard } from '@/lib/featureFlags';
import { GEMINI_VISION_MODELS } from '@/lib/geminiModels';
import { requireUser } from '@/lib/apiAuth';
import { rateLimitGuard, createCallBudget } from '@/lib/rateLimit';

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
  const modelsToTry = GEMINI_VISION_MODELS;

  let extractedText: string | null = null;
  let anyModelResponded = false;
  let isQuotaError = false;
  let timedOut = false;
  let lastErrorText = '';

  // Shared across all three models so they can't stack up past the platform's own
  // request timeout — see createCallBudget for why that matters.
  const budget = createCallBudget();

  for (const model of modelsToTry) {
    const signal = budget.next();
    if (!signal) {
      timedOut = true;
      break;
    }
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        signal,
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
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') timedOut = true;
      lastErrorText = err.message || String(err);
    }
  }

  if (extractedText !== null) return extractedText;
  if (anyModelResponded) return ''; // every model agreed there's no text — a normal result
  if (isQuotaError) throw new Error('AI extraction quota temporarily exceeded. Please try again in a few moments.');
  if (timedOut) throw new Error('Reading this document took too long. Please try again, or use a smaller file.');
  throw new Error(`PDF extraction failed. ${lastErrorText}`);
}

export async function POST(request: Request) {
    // Kill switch: an admin can disable this endpoint from the console
    // without a deploy (see lib/featureFlags.ts).
    const disabled = await featureGuard('extract_text');
    if (disabled) return disabled;

    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;

    // PDFs go to Gemini — cap how fast any one account can spend (see lib/rateLimit.ts).
    const throttled = rateLimitGuard(request, 'extract-text', auth.uid);
    if (throttled) return throttled;

  try {
    let buffer: Buffer;
    let fileName: string;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }
      buffer = Buffer.from(await file.arrayBuffer());
      fileName = file.name.toLowerCase();
    } else {
      // Card documents can be a base64 data URL (not yet uploaded) or an https
      // Storage URL (already promoted) — see promoteMediaToStorage in
      // app/platform/create/page.tsx. The client used to decode data URLs itself
      // and only ever sent bytes, which meant a client-side crash the moment a
      // card's url became https mid-session: it does not carry a base64 payload
      // to decode. Handling both forms server-side, the same way
      // /api/transcribe-image already does for images, removes that failure mode
      // entirely rather than asking the client to track which shape its own data
      // is in.
      const body = await request.json().catch(() => ({}));
      const documentUrl: string = body.documentUrl || '';
      fileName = String(body.fileName || 'document').toLowerCase();

      if (documentUrl.startsWith('data:')) {
        const match = documentUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
        if (!match) {
          return NextResponse.json({ error: 'Invalid data URL format' }, { status: 400 });
        }
        buffer = Buffer.from(match[2], 'base64');
      } else if (documentUrl.startsWith('http://') || documentUrl.startsWith('https://')) {
        const fileRes = await fetch(documentUrl);
        if (!fileRes.ok) {
          return NextResponse.json({ error: `Failed to fetch document: HTTP ${fileRes.status}` }, { status: 502 });
        }
        buffer = Buffer.from(await fileRes.arrayBuffer());
      } else {
        return NextResponse.json({ error: 'No document provided' }, { status: 400 });
      }
    }

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
