import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { GEMINI_TEXT_MODELS } from "@/lib/geminiModels";
import { withGeminiRetry, createCallBudget } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Proofreads a direct email the admin has written.
 *
 * Spelling, grammar and punctuation only: the wording, tone and language stay
 * the admin's. The model also has to leave the machinery alone, the
 * `{{name}}` placeholder, links and image syntax, because a "correction" to
 * those would break the email rather than polish it. Nothing is applied here;
 * the corrected text goes back to the editor with a list of what changed, and
 * the admin decides.
 */
export const POST = withAdmin("announcements.write", async (request) => {
    const body = await request.json().catch(() => ({}));
    const subject = String(body.subject || "");
    const text = String(body.body || "");

    if (!subject.trim() && !text.trim()) {
        return NextResponse.json({ error: "There is nothing to proofread yet" }, { status: 400 });
    }
    if (text.length > 20000) {
        return NextResponse.json({ error: "That email is too long to proofread in one go" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Proofreading is not configured on this server" }, { status: 503 });

    const systemPrompt = `You proofread emails written by the Veinote team to members of a songwriting platform.

Correct spelling, grammar, punctuation, capitalisation and obvious typos. Keep the writer's wording, tone, meaning, paragraphing and language (it may be English, Norwegian or Swedish; never translate). Do not shorten, expand, rephrase for style, or add anything.

Leave these exactly as they are, character for character: the placeholder {{name}}, every URL, every Markdown image ![...](...) and link [...](...), and Markdown markers such as ** and lists. Line breaks and blank lines stay where they are.

Replace any em dash or en dash with a comma, a full stop, or a new sentence.

Return only JSON: {"subject": "...", "body": "...", "changes": ["..."]}. "changes" is a short list, one entry per correction in the form "before → after" or a brief note. If nothing needs correcting, return the subject and body unchanged with an empty list.`;

    const prompt = `Subject:\n${subject}\n\nBody:\n${text}`;

    const budget = createCallBudget();
    let lastError: unknown = null;

    for (const model of GEMINI_TEXT_MODELS) {
        if (budget.expired()) break;
        try {
            const result = await withGeminiRetry(async () => {
                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        signal: budget.next(),
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            systemInstruction: { parts: [{ text: systemPrompt }] },
                            generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 4096 },
                        }),
                    },
                );
                if (!res.ok) throw Object.assign(new Error(`Gemini ${res.status}`), { status: res.status });
                const data = await res.json();
                const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!raw) throw new Error("Empty proofread");
                const parsed = JSON.parse(String(raw).trim());
                if (typeof parsed.subject !== "string" || typeof parsed.body !== "string") throw new Error("Malformed proofread");
                const changes: string[] = Array.isArray(parsed.changes)
                    ? parsed.changes.filter((c: unknown) => typeof c === "string").slice(0, 40)
                    : [];
                return { subject: parsed.subject, body: parsed.body, changes };
            });

            // The one thing worth checking rather than trusting: a proofread that
            // lost the placeholder or an image would send a broken email.
            const kept = (needle: RegExp) => (text.match(needle) || []).length === (result.body.match(needle) || []).length;
            if (!kept(/\{\{name\}\}/g) || !kept(/!\[[^\]]*\]\([^)]+\)/g) || !kept(/https?:\/\/\S+/g)) {
                return NextResponse.json(
                    { error: "The proofread changed a placeholder, link or image, so it was not applied. Try again." },
                    { status: 502 },
                );
            }

            // No correction if the model only reflowed whitespace.
            const same = result.subject.trim() === subject.trim() && result.body.trim() === text.trim();
            return NextResponse.json({
                subject: same ? subject : result.subject,
                body: same ? text : result.body,
                changes: same ? [] : result.changes,
                changed: !same,
                model,
            });
        } catch (err) {
            lastError = err;
        }
    }

    console.error("[email/proofread] every model failed:", lastError);
    return NextResponse.json({ error: "Couldn't proofread just now. Try again in a moment." }, { status: 502 });
});
