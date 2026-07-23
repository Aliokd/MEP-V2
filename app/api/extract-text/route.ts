import { NextResponse } from 'next/server';

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
      // Polyfill DOMMatrix for Node.js server environment to prevent pdf-parse layout trace crashes
      if (typeof global !== 'undefined' && !(global as any).DOMMatrix) {
        (global as any).DOMMatrix = class DOMMatrix {};
      }
      // Loaded lazily (only for .pdf requests) so a failure here doesn't take down
      // extraction for every other file type — this endpoint previously crashed on
      // ALL requests, including .txt files, because this require() ran unconditionally
      // at module load time for the entire route.
      let PDFParse: any;
      try {
        ({ PDFParse } = require('pdf-parse'));
        const parser = new PDFParse({ data: buffer });
        const data = await parser.getText();
        extractedText = data.text || '';
      } catch (loadErr: any) {
        console.error('Failed to load/run pdf-parse:', loadErr);
        // TEMP: surfacing the real error for diagnosis, will revert to a generic message once fixed.
        return NextResponse.json({ error: 'PDF extraction failed: ' + (loadErr?.message || String(loadErr)) + ' | stack: ' + (loadErr?.stack || '').slice(0, 500) }, { status: 500 });
      }
    } else if (fileName.endsWith('.docx')) {
      try {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value || '';
      } catch (loadErr: any) {
        console.error('Failed to load/run mammoth:', loadErr);
        // TEMP: surfacing the real error for diagnosis, will revert to a generic message once fixed.
        return NextResponse.json({ error: 'DOCX extraction failed: ' + (loadErr?.message || String(loadErr)) + ' | stack: ' + (loadErr?.stack || '').slice(0, 500) }, { status: 500 });
      }
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
