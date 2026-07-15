import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const word = searchParams.get('word');
    const mode = searchParams.get('mode') || 'rhyme'; // 'rhyme' | 'near' | 'synonym'
    const lang = searchParams.get('lang') || 'en'; // 'en' | 'no' | 'sv'

    if (!word || !word.trim()) {
      return NextResponse.json([]);
    }

    const cleanWord = word.trim().toLowerCase();

    // 1. English queries: Pass-through to Datamuse API (fast, free, native English)
    if (lang === 'en') {
      let relParam = 'rel_rhy';
      if (mode === 'near') relParam = 'rel_nry';
      if (mode === 'synonym') relParam = 'ml';

      try {
        const res = await fetch(`https://api.datamuse.com/words?${relParam}=${encodeURIComponent(cleanWord)}&max=40`);
        if (!res.ok) {
          throw new Error(`Datamuse returned status ${res.status}`);
        }
        const data = await res.json();
        return NextResponse.json(data.map((item: any) => ({
          word: item.word,
          syllables: item.numSyllables || 1,
          score: item.score || 100
        })));
      } catch (err) {
        console.error("Error fetching English lexicon from Datamuse:", err);
        return NextResponse.json([]);
      }
    }

    // 2. Swedish and Norwegian queries: AI-Powered Lexicon Endpoint
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not configured in .env.local. Multilingual lexicon results will be empty.");
      return NextResponse.json([]);
    }

    const languageName = lang === 'sv' ? 'Swedish' : 'Norwegian';
    let instructions = '';

    if (mode === 'rhyme') {
      instructions = `Find up to 35 words that perfectly rhyme with "${cleanWord}" in ${languageName}. Perfect rhymes must share the identical vowel and consonant sound starting from the last stressed syllable (e.g. Swedish "himmel" and "vimmel", Norwegian "stein" and "bein").`;
    } else if (mode === 'near') {
      instructions = `Find up to 35 words that are near-rhymes, slant rhymes, or share assonance/consonance with "${cleanWord}" in ${languageName} (e.g. words that sound musically similar but might not be perfect rhymes, like Swedish "hjärta" and "smärta" or slant matches).`;
    } else {
      instructions = `Find up to 35 synonyms or semantically closely related words for "${cleanWord}" in ${languageName}.`;
    }

    const prompt = `
You are a professional songwriting assistant. Analyze the ${languageName} word: "${cleanWord}".
${instructions}

Provide the output strictly as a JSON array of objects representing the matches. Do not wrap the JSON in markdown code blocks (\`\`\`json) or include any explanation.
The schema MUST be:
[
  { "word": "matching_word", "syllables": syllable_count_integer, "score": score_integer_from_1_to_1000_representing_match_quality }
]

Ensure:
- Words are real, standard ${languageName} words, spelled correctly.
- Syllables represent the exact syllable count in ${languageName}.
- Sort the results by score in descending order.
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`Gemini API returned status ${aiResponse.status}: ${errText}`);
    }

    const resultData = await aiResponse.json();
    const textResponse = resultData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error("Empty response from Gemini API");
    }

    const parsedResults = JSON.parse(textResponse.trim());
    return NextResponse.json(parsedResults);

  } catch (error: any) {
    console.error("Lexicon API Endpoint error:", error);
    return NextResponse.json([]);
  }
}
