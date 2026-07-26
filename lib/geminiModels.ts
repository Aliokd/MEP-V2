/**
 * Gemini model chains, in one place.
 *
 * Every AI route tries a list of models in order, falling back when one is
 * unavailable. Those lists used to be copy-pasted into five separate route
 * files, which is how `gemini-2.5-flash-lite` — retiring 16 October 2026 — ended
 * up pinned as the first choice everywhere, and how an audio route acquired a
 * fallback model that does not accept audio at all. Keeping them here means a
 * model change is one edit, not five.
 *
 * Chains are ordered cheapest-capable first, with a more capable model second so
 * a hard input (messy handwriting, noisy audio) still has somewhere to go.
 *
 * Prices per 1M tokens, from ai.google.dev/gemini-api/docs/pricing (July 2026):
 *
 *   gemini-3.1-flash-lite   $0.25 in / $1.50 out / $0.50 audio in
 *   gemini-2.5-flash        $0.30 in / $2.50 out / $1.00 audio in
 *   gemini-3.5-flash-lite   $0.30 in / $2.50 out / audio NOT supported
 *   gemini-2.5-flash-lite   $0.10 in / $0.40 out — RETIRES 2026-10-16, do not use
 */

/**
 * Audio in, text out — voice memo transcription and instrument classification.
 *
 * Deliberately excludes gemini-3.5-flash-lite: it is cheap and current, but the
 * pricing table lists no audio input rate for it, so it cannot serve this chain.
 * Only add a model here after confirming it accepts audio input.
 */
export const GEMINI_AUDIO_MODELS = [
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
] as const;

/**
 * Image or PDF in, text out — handwriting OCR and document extraction.
 *
 * 2.5-flash sits second on purpose: it is the stronger reader, and the inputs
 * that reach a fallback are exactly the hard ones (cursive, poor lighting).
 */
export const GEMINI_VISION_MODELS = [
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
] as const;

/**
 * Text in, text out — spellcheck.
 *
 * Pinned rather than using a `-latest` alias. An alias never breaks on
 * retirement, but it can silently move onto a pricier model (3.5-flash-lite is
 * 20% dearer on input and 67% dearer on output than 3.1-flash-lite) with no
 * change on our side. For a route that fires on every word click, predictable
 * cost is worth more than automatic migration.
 */
export const GEMINI_TEXT_MODELS = [
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
] as const;
