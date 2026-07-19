import { NextResponse } from 'next/server';

// Server-side in-memory cache for multilingual lexicon queries
const lexiconCache = new Map<string, any>();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const word = searchParams.get('word');
    const mode = searchParams.get('mode') || 'rhyme'; // 'rhyme' | 'near' | 'synonym'
    let lang = searchParams.get('lang') || 'en'; // 'en' | 'no' | 'sv'

    if (!word || !word.trim()) {
      return NextResponse.json([]);
    }

    const cleanWord = word.trim().toLowerCase();

    // Auto-detect Swedish or Norwegian if lang is English but the word contains Nordic characters or is a known Scandinavian word
    const hasNordicChars = /[åäöæøÅÄÖÆØ]/.test(cleanWord);
    const isNordicStopword = /\b(och|jeg|det|att|som|til|på|vi|med|eller|men|mig|dig|sig|oss|dere|dem|vår|min|din|sin|hans|hennes|dette|dene|mycket|tack|herre|gud|kärlek|himmel|land|norge|sverige|bra|hej|hei|takk)\b/i.test(cleanWord);

    if (lang === 'en' && (hasNordicChars || isNordicStopword)) {
      const isNorwegian = /[æøÆØ]/.test(cleanWord) || /\b(jeg|deg|meg|sig|dere|til|hei|takk)\b/i.test(cleanWord);
      lang = isNorwegian ? 'no' : 'sv';
    }

    const cacheKey = `${lang}:${mode}:${cleanWord}`;

    // 1. Check in-memory cache first (delivers sub-millisecond response for repeat requests)
    if (lexiconCache.has(cacheKey)) {
      return NextResponse.json(lexiconCache.get(cacheKey));
    }

    // 2. English queries: Pass-through to Datamuse API (fast, free, native English)
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
        const formattedData = data.map((item: any) => ({
          word: item.word,
          syllables: item.numSyllables || 1,
          score: item.score || 100
        }));
        // Store in cache
        lexiconCache.set(cacheKey, formattedData);
        return NextResponse.json(formattedData);
      } catch (err) {
        console.error("Error fetching English lexicon from Datamuse:", err);
        return NextResponse.json([]);
      }
    }

    // 3. Swedish and Norwegian queries: Optimized AI-Powered Lexicon Endpoint
    const apiKey = process.env.GEMINI_API_KEY;
    console.log(`[Lexicon API] Querying word: "${cleanWord}", mode: "${mode}", lang: "${lang}". Key present: ${!!apiKey}`);
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not configured. Multilingual lexicon results will be empty.");
      return NextResponse.json([]);
    }

    const languageName = lang === 'sv' ? 'Swedish' : 'Norwegian';
    let instructions = '';

    if (mode === 'rhyme') {
      instructions = `Find words that perfectly rhyme with "${cleanWord}". Prioritize native ${languageName} words. You should also include a few highly relevant English words that rhyme with "${cleanWord}" as secondary options at the end.`;
    } else if (mode === 'near') {
      instructions = `Find words that are near-rhymes, slant rhymes, or share assonance/consonance with "${cleanWord}". Prioritize native ${languageName} words. You should also include a few highly relevant English slant rhymes as secondary options at the end.`;
    } else {
      instructions = `Find synonyms or semantically closely related words for "${cleanWord}". Prioritize native ${languageName} words. You should also include a few highly relevant English synonyms/related words as secondary options at the end.`;
    }

    const prompt = `Analyze the ${languageName} word: "${cleanWord}". ${instructions}`;

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
            {
              text: `You are a professional songwriting assistant. Analyze the requested word and find matching rhymes, near-rhymes, or synonyms. Keep replies strictly as JSON arrays of objects conforming to the requested schema. No markdown formatting, no code block wrap.
Schema: [ { "word": "matching_word", "syllables": syllable_count_integer, "score": score_integer_from_1_to_1000 } ]

CRITICAL RULES:
1. Primary results must be in ${languageName} (authentic, native vocabulary). Assign them higher scores (e.g. 600 to 1000) so they appear first.
2. Include some highly relevant English words that rhyme or are synonymous as secondary options. Assign them lower scores (e.g. 100 to 500) so they appear at the end. This allows songwriters to mix ${languageName} and English.
3. Sort the final JSON array by score in descending order. Ensure syllables represent the exact count.`
            }
          ]
        },
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.15,
          maxOutputTokens: 2000
        }
      })
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(`[Lexicon API] Gemini API error: ${aiResponse.status} - ${errText}`);
      throw new Error(`Gemini API returned status ${aiResponse.status}: ${errText}`);
    }

    const resultData = await aiResponse.json();
    const textResponse = resultData.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log(`[Lexicon API] Gemini raw response: ${textResponse}`);

    if (!textResponse) {
      throw new Error("Empty response from Gemini API");
    }

    const parsedResults = JSON.parse(textResponse.trim());
    
    // Store in cache
    lexiconCache.set(cacheKey, parsedResults);
    
    return NextResponse.json(parsedResults);

  } catch (error: any) {
    console.error("Lexicon API Endpoint error:", error);
    return NextResponse.json([]);
  }
}
