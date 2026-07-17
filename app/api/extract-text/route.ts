import { NextResponse } from 'next/server';
import mammoth from 'mammoth';

// Polyfill DOMMatrix for Node.js server environment to prevent pdf-parse layout trace crashes
if (typeof global !== 'undefined') {
  if (!(global as any).DOMMatrix) {
    (global as any).DOMMatrix = class DOMMatrix {};
  }
}

// Use require for pdf-parse since it lacks a default ESM export
const { PDFParse } = require('pdf-parse');

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
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      extractedText = data.text || '';
    } else if (fileName.endsWith('.docx')) {
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
