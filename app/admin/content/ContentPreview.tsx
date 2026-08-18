"use client";

import IdeaGlyph from "@/app/platform/components/IdeaGlyph";
import LessonBlocks from "@/app/platform/components/LessonBlocks";
import { pickLocale, type Locale, type LocalizedText } from "@/lib/content";
import { isBlockRenderable, type LessonBlock } from "@/lib/lessonBlocks";
import type { ContentItem } from "./page";

/**
 * Shows the draft the way a reader will see it.
 *
 * The platform's own components do the drawing wherever there is one to reuse —
 * LessonBlocks here is the very component the lesson page renders — so a preview
 * cannot quietly drift from the thing it claims to preview. Where the platform
 * has no reusable piece (the video player owns progress tracking, the ideas deck
 * owns swipe state) the surrounding chrome is restated with the same classes,
 * and nothing here writes anything.
 *
 * Light on purpose: the admin is dark, the platform is paper, and a preview that
 * borrowed the admin's palette would be lying about the part it is best placed
 * to show.
 */
export default function ContentPreview({
    collection,
    draft,
    locale,
}: {
    collection: "chapters" | "lessons" | "ideas" | "songs";
    draft: ContentItem;
    locale: Locale;
}) {
    const text = (key: string) => pickLocale((draft[key] as LocalizedText) || {}, locale);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
                <span className="text-xs text-ink-400">Preview</span>
                <span className="text-[11px] text-ink-600">
                    as a reader sees it{locale !== "en" ? ` · ${locale.toUpperCase()}` : ""}
                </span>
            </div>

            {/* The platform's own surface colour, so contrast reads truthfully. */}
            <div className="rounded-[20px] bg-[#E4E4DF] p-5 font-sans text-stone-900">
                {collection === "lessons" && <LessonPreview draft={draft} locale={locale} text={text} />}
                {collection === "ideas" && <IdeaPreview draft={draft} text={text} />}
                {collection === "chapters" && <ChapterPreview text={text} />}
                {collection === "songs" && <SongPreview draft={draft} />}
            </div>
        </div>
    );
}

function LessonPreview({
    draft,
    locale,
    text,
}: {
    draft: ContentItem;
    locale: Locale;
    text: (key: string) => string;
}) {
    const title = text("title");
    const summary = text("summary");
    const blocks = ((draft.blocks as LessonBlock[]) || []).filter((b) => isBlockRenderable(b, locale));

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-sans font-light text-stone-900">
                {title || <span className="text-stone-400">Untitled lesson</span>}
            </h1>

            {draft.videoUrl ? (
                // A plain element rather than LessonContent: that component reports
                // progress and marks lessons complete, which a preview must not do.
                <video
                    src={draft.videoUrl}
                    poster={draft.posterUrl || undefined}
                    controls
                    preload="none"
                    className="w-full rounded-[18px] border border-stone-200 bg-black"
                />
            ) : (
                <div className="w-full aspect-video rounded-[18px] border border-dashed border-stone-300 bg-white/50 flex items-center justify-center text-xs text-stone-400">
                    No video yet
                </div>
            )}

            {blocks.length > 0 && <LessonBlocks blocks={blocks} locale={locale} />}

            {summary ? (
                <div className="w-full text-sm text-stone-700 leading-relaxed font-sans space-y-4">
                    {summary.split(/\n{2,}/).map((paragraph, i) => (
                        <p key={i} className="whitespace-pre-line">{paragraph.trim()}</p>
                    ))}
                </div>
            ) : blocks.length === 0 ? (
                // Matches what the reader falls back to, so an editor can see that
                // this lesson is still showing generic filler.
                <p className="text-xs text-stone-500 italic">
                    Nothing written yet — the lesson shows the generic placeholder text.
                </p>
            ) : null}
        </div>
    );
}

function IdeaPreview({ draft, text }: { draft: ContentItem; text: (key: string) => string }) {
    return (
        <div className="bg-[#FAF9F5] border border-stone-200/80 rounded-[20px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col gap-5">
            <div className="flex gap-5">
                <div className="w-24 h-24 shrink-0 flex items-center justify-center">
                    <IdeaGlyph seed={draft.id || "preview"} category={draft.category} className="w-full h-full" />
                </div>

                <div className="flex-1 flex flex-col gap-3 min-w-0">
                    <h3 className="text-xl font-sans font-normal text-stone-800">
                        {text("title") || <span className="text-stone-400">Untitled idea</span>}
                    </h3>
                    <p className="text-sm font-sans text-stone-500 leading-relaxed">{text("description")}</p>

                    {text("whyItHelps") && (
                        <div className="flex flex-col gap-1 pt-1">
                            <span className="text-xs font-sans font-semibold text-stone-500">Why it helps</span>
                            <p className="text-sm font-sans text-stone-400 leading-relaxed">{text("whyItHelps")}</p>
                        </div>
                    )}

                    {text("example") && (
                        <p className="text-sm font-sans text-stone-500 italic border-l-2 border-stone-200 pl-3">
                            {text("example")}
                        </p>
                    )}
                </div>
            </div>

            <span className="self-start text-[11px] text-stone-400">{draft.category || "lyrics"}</span>
        </div>
    );
}

function ChapterPreview({ text }: { text: (key: string) => string }) {
    return (
        <div className="w-full border border-stone-200/60 rounded-[20px] p-6 bg-white/60 flex flex-col gap-2">
            <h2 className="text-lg font-sans font-medium text-stone-800">
                {text("title") || <span className="text-stone-400">Untitled chapter</span>}
            </h2>
            <p className="text-sm text-stone-500 font-sans leading-relaxed">{text("description")}</p>
        </div>
    );
}

function SongPreview({ draft }: { draft: ContentItem }) {
    return (
        <div className="flex items-center gap-4 bg-[#FAF9F5] border border-stone-200/80 rounded-[20px] p-4">
            {draft.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Cloud Storage URL, no allowlisted host.
                <img src={draft.coverUrl} alt="" className="w-16 h-16 rounded-[12px] object-cover border border-stone-200" />
            ) : (
                <div className="w-16 h-16 rounded-[12px] border border-dashed border-stone-300 bg-white/50" />
            )}
            <div className="flex flex-col gap-1 min-w-0">
                <span className="text-base font-sans font-medium text-stone-800 truncate">
                    {(draft.title as string) || "Untitled song"}
                </span>
                <span className="text-sm text-stone-500 font-sans truncate">{draft.artist || "Unknown artist"}</span>
            </div>
        </div>
    );
}
