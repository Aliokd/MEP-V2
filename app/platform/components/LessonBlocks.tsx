"use client";

import React from "react";
import { pickLocale, type Locale } from "@/lib/content";
import {
    isBlockRenderable,
    isSafeUrl,
    renderParagraphs,
    resolveEmbed,
    type LessonBlock,
} from "@/lib/lessonBlocks";

/**
 * Renders the structured content of a lesson.
 *
 * Every branch here draws a shape this component already knows. Nothing an
 * author types becomes markup: text is escaped and given a fixed set of inline
 * marks, embeds are rebuilt from a recognised id, and any URL that isn't http(s)
 * is refused. There is no path from the editor to arbitrary HTML.
 *
 * The locale is passed in rather than read from context so the admin preview can
 * render a language the person editing is not currently browsing in.
 */
export default function LessonBlocks({ blocks, locale }: { blocks: LessonBlock[]; locale: Locale }) {
    const language = locale;

    const visible = blocks.filter((block) => isBlockRenderable(block, language));
    if (visible.length === 0) return null;

    return (
        <div className="w-full flex flex-col gap-6">
            {visible.map((block) => {
                switch (block.type) {
                    case "text": {
                        const paragraphs = renderParagraphs(pickLocale(block.body, language));
                        return (
                            <div key={block.id} className="flex flex-col gap-3">
                                {paragraphs.map((html, i) => (
                                    <p
                                        key={i}
                                        className="text-sm text-stone-700 leading-relaxed font-sans"
                                        dangerouslySetInnerHTML={{ __html: html }}
                                    />
                                ))}
                            </div>
                        );
                    }

                    case "callout": {
                        const paragraphs = renderParagraphs(pickLocale(block.body, language));
                        const tone =
                            block.tone === "warning"
                                ? "border-amber-300/70 bg-amber-50/60"
                                : block.tone === "tip"
                                  ? "border-[#86BE7F]/50 bg-[#eaf5ec]/50"
                                  : "border-stone-300/70 bg-white/60";
                        return (
                            <div key={block.id} className={`rounded-2xl border p-5 flex flex-col gap-2 ${tone}`}>
                                {paragraphs.map((html, i) => (
                                    <p
                                        key={i}
                                        className="text-sm text-stone-700 leading-relaxed font-sans"
                                        dangerouslySetInnerHTML={{ __html: html }}
                                    />
                                ))}
                            </div>
                        );
                    }

                    case "image":
                        return (
                            <figure key={block.id} className="flex flex-col gap-2">
                                {/* eslint-disable-next-line @next/next/no-img-element -- author-supplied
                                    URLs from Cloud Storage; next/image would need every host allowlisted. */}
                                <img
                                    src={block.url}
                                    alt={pickLocale(block.alt, language)}
                                    loading="lazy"
                                    className="w-full rounded-[18px] border border-stone-200"
                                />
                                {pickLocale(block.caption, language) && (
                                    <figcaption className="text-xs text-stone-500 font-sans">
                                        {pickLocale(block.caption, language)}
                                    </figcaption>
                                )}
                            </figure>
                        );

                    case "audio":
                        return (
                            <div key={block.id} className="flex flex-col gap-2 rounded-[18px] border border-stone-200 bg-white/70 p-4">
                                {pickLocale(block.title, language) && (
                                    <span className="text-sm font-medium text-stone-700 font-sans">
                                        {pickLocale(block.title, language)}
                                    </span>
                                )}
                                <audio controls preload="none" src={block.url} className="w-full">
                                    Your browser can&apos;t play this audio.
                                </audio>
                            </div>
                        );

                    case "video":
                        return (
                            <video
                                key={block.id}
                                controls
                                preload="metadata"
                                poster={block.posterUrl || undefined}
                                src={block.url}
                                className="w-full rounded-[18px] border border-stone-200 bg-black"
                            />
                        );

                    case "embed": {
                        const embed = resolveEmbed(block.url);
                        if (!embed) {
                            // Unrecognised but safe: a link is better than nothing,
                            // and better than an iframe pointed at a host we haven't
                            // vetted.
                            return isSafeUrl(block.url) ? (
                                <a
                                    key={block.id}
                                    href={block.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-stone-700 underline underline-offset-4 hover:opacity-70 font-sans break-all"
                                >
                                    {block.url}
                                </a>
                            ) : null;
                        }

                        const fixedHeight = embed.aspect.endsWith("px");
                        return (
                            <div
                                key={block.id}
                                className="w-full overflow-hidden rounded-[18px] border border-stone-200 bg-black/5"
                                style={fixedHeight ? { height: embed.aspect } : { position: "relative", paddingBottom: embed.aspect }}
                            >
                                <iframe
                                    src={embed.src}
                                    title={embed.title}
                                    loading="lazy"
                                    allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                                    allowFullScreen
                                    // Sandboxed: the embed may run its own player,
                                    // but it gets no access to this page.
                                    sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                                    className={fixedHeight ? "w-full h-full border-0" : "absolute inset-0 w-full h-full border-0"}
                                />
                            </div>
                        );
                    }

                    default:
                        return null;
                }
            })}
        </div>
    );
}
