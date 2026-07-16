import { NextResponse } from 'next/server';

// Simple cache to store spellcheck results
const spellcheckCache = new Map<string, any>();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const word = searchParams.get('word');
    const lang = searchParams.get('lang') || 'en';

    if (!word || !word.trim()) {
      return NextResponse.json({ correct: true, suggestions: [] });
    }

    const cleanWord = word.trim().toLowerCase();
    const cacheKey = `${lang}:${cleanWord}`;

    if (spellcheckCache.has(cacheKey)) {
      return NextResponse.json(spellcheckCache.get(cacheKey));
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not configured in .env.local.");
      return NextResponse.json({ correct: true, suggestions: [] });
    }

    const languageName = lang === 'sv' ? 'Swedish' : lang === 'no' ? 'Norwegian' : 'English';
    const systemPrompt = `You are a spelling correction assistant for songwriters. Analyze the given word in ${languageName}.
Check if the word is spelled correctly in ${languageName}.
If it is spelled correctly, return JSON: {"correct": true, "suggestions": []}.
If it is misspelled or has a typo, return JSON: {"correct": false, "suggestions": ["correct_spelling_1", "correct_spelling_2"]}. Offer 1 to 3 high-quality suggestions.
Return only valid JSON matching the schema, with no markdown code blocks or wrapper text.`;

    const prompt = `Word to check: "${cleanWord}" in ${languageName}.`;
    
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`;

    const aiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        systemInstruction: {
          parts: [
            { text: systemPrompt }
          ]
        },
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 300
        }
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`Gemini API returned status ${aiResponse.status}`);
    }

    const resultData = await aiResponse.json();
    const textResponse = resultData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error("Empty response from Gemini API");
    }

    const parsedResults = JSON.parse(textResponse.trim());
    
    // Store in cache
    spellcheckCache.set(cacheKey, parsedResults);
    
    return NextResponse.json(parsedResults);

  } catch (error: any) {
    console.error("Spellcheck API Endpoint error:", error);
    return NextResponse.json({ correct: true, suggestions: [] });
  }
}
