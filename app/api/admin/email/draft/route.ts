import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { GEMINI_TEXT_MODELS } from "@/lib/geminiModels";
import { withGeminiRetry, createCallBudget } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const LANGUAGE_NAMES: Record<string, string> = { en: "English", no: "Norwegian (bokmål)", sv: "Swedish" };

/**
 * Drafts a direct email from a one-line brief.
 *
 * The admin describes what the email is for; the model returns a subject and a
 * body the admin then edits. It is a starting point, not a sender — nothing
 * leaves here, and the draft lands in the same editor as a hand-written one.
 *
 * The body comes back as Markdown, because that is what the editor holds and
 * what the send route renders. Asking for HTML would hand a model the one
 * format the renderer refuses on purpose.
 */
export const POST = withAdmin("announcements.write", async (request) => {
    const body = await request.json().catch(() => ({}));
    const brief = String(body.prompt || "").trim();
    const language = LANGUAGE_NAMES[String(body.language || "en")] || LANGUAGE_NAMES.en;
    const recipientNames: string[] = Array.isArray(body.recipientNames)
        ? body.recipientNames.filter((n: unknown) => typeof n === "string").slice(0, 10)
        : [];

    if (brief.length < 8) return NextResponse.json({ error: "Say a little more about what the email is for" }, { status: 400 });
    if (brief.length > 2000) return NextResponse.json({ error: "Keep the brief under 2000 characters" }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Drafting is not configured on this server" }, { status: 503 });

    const systemPrompt = `You write emails on behalf of Veinote, a songwriting platform, to individual members. Veinote helps songwriters draft lyrics, record takes, practise, and finish songs together.

Write in ${language}. Warm, direct, plainly worded, and short: a person is reading this, not a list. Two to five short paragraphs. No corporate filler, no exclamation marks in a row, no emoji.

Address the reader as {{name}} exactly like that, once, at the start (for example "Hi {{name}},"). It is replaced with their first name when the email is sent.

Do not use em dashes or en dashes anywhere. Use a comma, a full stop, or start a new sentence instead.

The body is Markdown: paragraphs separated by blank lines, **bold** for at most one phrase if it earns it, and a link written as [text](https://...) only if the brief gives a URL. No headings, no HTML, no images, no sign-off template. End with a one-line sign-off and the team's name on its own line, in the email's language ("The Veinote team", "Veinote-teamet"), or the sender's name if the brief names one.

Return only JSON: {"subject": "...", "body": "..."}. The subject is under 60 characters and does not use the word "Re:".`;

    const context = recipientNames.length > 0 ? `\n\nRecipients: ${recipientNames.join(", ")}.` : "";
    const prompt = `Brief for the email: ${brief}${context}`;

    const budget = createCallBudget();
    let lastError: unknown = null;

    for (const model of GEMINI_TEXT_MODELS) {
        if (budget.expired()) break;
        try {
            const draft = await withGeminiRetry(async () => {
                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        signal: budget.next(),
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            systemInstruction: { parts: [{ text: systemPrompt }] },
                            generationConfig: { responseMimeType: "application/json", temperature: 0.6, maxOutputTokens: 1024 },
                        }),
                    },
                );
                if (!res.ok) throw Object.assign(new Error(`Gemini ${res.status}`), { status: res.status });
                const data = await res.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) throw new Error("Empty draft");
                const parsed = JSON.parse(String(text).trim());
                if (typeof parsed.subject !== "string" || typeof parsed.body !== "string") throw new Error("Malformed draft");
                return { subject: parsed.subject.trim(), body: parsed.body.trim() };
            });

            // Belt and braces on the one style rule that matters most here. The
            // prompt forbids dashes; a model that slips is corrected rather than
            // trusted.
            const strip = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").replace(/, ,/g, ",");
            return NextResponse.json({ subject: strip(draft.subject), body: strip(draft.body), model });
        } catch (err) {
            lastError = err;
        }
    }

    console.error("[email/draft] every model failed:", lastError);
    return NextResponse.json({ error: "Couldn't draft that just now. Try again in a moment." }, { status: 502 });
});
