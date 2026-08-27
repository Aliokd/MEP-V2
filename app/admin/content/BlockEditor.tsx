"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Type, Image as ImageIcon, Music, Video, Link2, Info, ExternalLink } from "lucide-react";
import { Badge, Button, Input, Panel, Select, Textarea } from "../components/ui";
import MediaUpload from "../components/MediaUpload";
import { MarkdownField } from "../components/MarkdownToolbar";
import { uploadContentMedia, type VideoProbe } from "@/lib/uploadContentMedia";
import { LOCALE_LABELS, type Locale, type LocalizedText } from "@/lib/content";
import {
    BLOCK_LABELS,
    emptyBlock,
    isSafeUrl,
    resolveEmbed,
    type LessonBlock,
    type LessonBlockType,
} from "@/lib/lessonBlocks";

const BLOCK_ICONS: Record<LessonBlockType, React.ElementType> = {
    text: Type,
    image: ImageIcon,
    audio: Music,
    video: Video,
    embed: Link2,
    callout: Info,
};

const ADDABLE: LessonBlockType[] = ["text", "image", "audio", "video", "embed", "callout"];

/**
 * Arranges a lesson's content as an ordered list of blocks.
 *
 * Files are uploaded with the same component the lesson video uses, so an
 * image or audio snippet goes straight from the browser to Cloud Storage and
 * the URL fills itself in — an author never handles a link by hand unless they
 * want to paste an external one.
 */
export default function BlockEditor({
    blocks,
    locale,
    nameHint,
    onChange,
}: {
    blocks: LessonBlock[];
    /** Which language the localized fields are being edited in. */
    locale: Locale;
    nameHint: string;
    onChange: (blocks: LessonBlock[]) => void;
}) {
    const [adding, setAdding] = useState(false);
    const [posterNote, setPosterNote] = useState<Record<string, string>>({});

    // Uploads finish long after the render that started them, and the list they
    // captured is stale by then — writing a poster back from that closure would
    // wipe the URL the finished upload had just set. Every edit reads through
    // this ref instead, which is always the list as it stands now.
    const latest = useRef(blocks);
    latest.current = blocks;

    const update = (id: string, patch: Partial<LessonBlock>) =>
        onChange(latest.current.map((b) => (b.id === id ? ({ ...b, ...patch } as LessonBlock) : b)));

    const updateLocalized = (id: string, field: string, value: string) =>
        onChange(
            latest.current.map((b) => {
                if (b.id !== id) return b;
                const current = ((b as any)[field] || {}) as LocalizedText;
                return { ...b, [field]: { ...current, [locale]: value } } as LessonBlock;
            }),
        );

    const localizedValue = (block: LessonBlock, field: string) =>
        (((block as any)[field] || {}) as LocalizedText)[locale] || "";

    const move = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= blocks.length) return;
        const next = [...blocks];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    const remove = (id: string) => {
        if (!window.confirm("Remove this block?")) return;
        onChange(blocks.filter((b) => b.id !== id));
    };

    /**
     * Uses the first frame MediaUpload captured as the block's poster, so a video
     * inside a lesson has something to show before it is played without anyone
     * exporting a still by hand.
     */
    const capturePoster = async (blockId: string, probe: VideoProbe, file: File) => {
        if (!probe.poster) {
            setPosterNote((n) => ({ ...n, [blockId]: "Couldn't capture a frame — this clip shows black until played." }));
            return;
        }
        setPosterNote((n) => ({ ...n, [blockId]: "Capturing poster…" }));
        try {
            const posterFile = new File([probe.poster], `${file.name}-poster.jpg`, { type: "image/jpeg" });
            const { done } = uploadContentMedia(posterFile, "poster", nameHint, () => {});
            update(blockId, { posterUrl: await done } as any);
            setPosterNote((n) => ({ ...n, [blockId]: "Poster captured from the first frame." }));
        } catch (err: any) {
            setPosterNote((n) => ({ ...n, [blockId]: `Poster upload failed (${err.message}).` }));
        }
    };

    const add = (type: LessonBlockType) => {
        onChange([...blocks, emptyBlock(type)]);
        setAdding(false);
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <span className="text-xs text-ink-400">Lesson content</span>
                <span className="text-[11px] text-ink-600">
                    {blocks.length} {blocks.length === 1 ? "block" : "blocks"} · editing {LOCALE_LABELS[locale]}
                </span>
            </div>

            {blocks.map((block, index) => {
                const Icon = BLOCK_ICONS[block.type];
                return (
                    <Panel key={block.id} className="p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5 text-ink-500 shrink-0" />
                            <span className="text-xs text-ink-300">{BLOCK_LABELS[block.type]}</span>
                            <span className="text-[11px] text-ink-600">#{index + 1}</span>

                            <div className="ml-auto flex items-center gap-1">
                                <button
                                    onClick={() => move(index, -1)}
                                    disabled={index === 0}
                                    className="p-1 text-ink-500 hover:text-ink-100 disabled:opacity-30 transition-colors"
                                    title="Move up"
                                >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => move(index, 1)}
                                    disabled={index === blocks.length - 1}
                                    className="p-1 text-ink-500 hover:text-ink-100 disabled:opacity-30 transition-colors"
                                    title="Move down"
                                >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => remove(block.id)}
                                    className="p-1 text-ink-500 hover:text-red-300 transition-colors"
                                    title="Remove"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {block.type === "text" && (
                            <MarkdownField
                                rows={6}
                                value={localizedValue(block, "body")}
                                onChange={(next) => updateLocalized(block.id, "body", next)}
                                // No headings or lists: a heading is its own block,
                                // and the renderer draws neither inside a text block.
                                actions={["bold", "italic", "link"]}
                                placeholder="Blank lines separate paragraphs."
                                hint="Bold, italic and links only. For a heading or a picture, add another block."
                            />
                        )}

                        {block.type === "callout" && (
                            <div className="flex flex-col gap-2">
                                <Select
                                    value={block.tone}
                                    onChange={(e) => update(block.id, { tone: e.target.value } as any)}
                                    className="w-40"
                                >
                                    <option value="note">Note</option>
                                    <option value="tip">Tip</option>
                                    <option value="warning">Watch out</option>
                                </Select>
                                <MarkdownField
                                    rows={3}
                                    value={localizedValue(block, "body")}
                                    onChange={(next) => updateLocalized(block.id, "body", next)}
                                    actions={["bold", "italic", "link"]}
                                    placeholder="Something worth setting apart from the main text."
                                />
                            </div>
                        )}

                        {block.type === "image" && (
                            <div className="flex flex-col gap-3">
                                <MediaUpload
                                    label="Image"
                                    kind="image"
                                    value={block.url}
                                    onChange={(url) => update(block.id, { url } as any)}
                                    nameHint={nameHint}
                                />
                                <Input
                                    value={localizedValue(block, "alt")}
                                    onChange={(e) => updateLocalized(block.id, "alt", e.target.value)}
                                    placeholder="Describe the image for someone who can't see it"
                                />
                                <Input
                                    value={localizedValue(block, "caption")}
                                    onChange={(e) => updateLocalized(block.id, "caption", e.target.value)}
                                    placeholder="Caption (optional)"
                                />
                            </div>
                        )}

                        {block.type === "audio" && (
                            <div className="flex flex-col gap-3">
                                <MediaUpload
                                    label="Audio"
                                    kind="audio"
                                    value={block.url}
                                    onChange={(url) => update(block.id, { url } as any)}
                                    nameHint={nameHint}
                                    hint="A short snippet — a riff, a chord change, a vocal take."
                                />
                                <Input
                                    value={localizedValue(block, "title")}
                                    onChange={(e) => updateLocalized(block.id, "title", e.target.value)}
                                    placeholder="Label shown above the player (optional)"
                                />
                            </div>
                        )}

                        {block.type === "video" && (
                            <div className="flex flex-col gap-2">
                                <MediaUpload
                                    label="Video"
                                    kind="video"
                                    value={block.url}
                                    onChange={(url) => update(block.id, { url } as any)}
                                    nameHint={nameHint}
                                    onVideoProbed={(probe, file) => capturePoster(block.id, probe, file)}
                                    hint="An extra clip inside the lesson, separate from the main video."
                                />
                                {posterNote[block.id] && (
                                    <span className="text-[11px] text-ink-500">{posterNote[block.id]}</span>
                                )}
                            </div>
                        )}

                        {block.type === "embed" && (
                            <div className="flex flex-col gap-2">
                                <Input
                                    value={block.url}
                                    onChange={(e) => update(block.id, { url: e.target.value } as any)}
                                    placeholder="https://youtube.com/watch?v=… or vimeo.com/… or open.spotify.com/…"
                                    className="font-mono text-xs"
                                />
                                <EmbedStatus url={block.url} />
                            </div>
                        )}
                    </Panel>
                );
            })}

            {adding ? (
                <Panel className="p-4 flex flex-wrap gap-2">
                    {ADDABLE.map((type) => {
                        const Icon = BLOCK_ICONS[type];
                        return (
                            <Button key={type} size="sm" onClick={() => add(type)}>
                                <Icon className="w-3.5 h-3.5" /> {BLOCK_LABELS[type]}
                            </Button>
                        );
                    })}
                    <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                </Panel>
            ) : (
                <Button size="sm" onClick={() => setAdding(true)} className="self-start">
                    <Plus className="w-3.5 h-3.5" /> Add block
                </Button>
            )}
        </div>
    );
}

/** Says whether a pasted URL will embed, and as what, before the lesson ships. */
function EmbedStatus({ url }: { url: string }) {
    if (!url.trim()) {
        return <span className="text-[11px] text-ink-500">YouTube, Vimeo and Spotify embed. Anything else shows as a link.</span>;
    }

    const embed = resolveEmbed(url);
    if (embed) {
        return (
            <span className="text-[11px] text-green-400 flex items-center gap-1.5">
                <Badge tone="green">{embed.provider}</Badge>
                Embeds as a player.
            </span>
        );
    }

    if (isSafeUrl(url)) {
        return (
            <span className="text-[11px] text-gold-300 flex items-center gap-1.5">
                <ExternalLink className="w-3 h-3" />
                Not a recognised provider — this shows as a plain link.
            </span>
        );
    }

    return <span className="text-[11px] text-red-300">That isn&apos;t a usable web address.</span>;
}
