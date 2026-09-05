"use client";

import { useRef, useState } from "react";
import { Upload, X, Check, TriangleAlert, ExternalLink } from "lucide-react";
import { Button, Input, Spinner } from "./ui";
import {
    formatBytes,
    probeVideo,
    uploadContentMedia,
    type MediaKind,
    type UploadHandle,
    type VideoProbe,
} from "@/lib/uploadContentMedia";

/** Above this, an upload is slow enough that it should have been compressed first. */
const LARGE_FILE_BYTES = 200 * 1024 * 1024;

const ACCEPT: Record<MediaKind, string> = {
    video: "video/*",
    poster: "image/*",
    audio: "audio/*",
    image: "image/*",
};

interface MediaUploadProps {
    label: string;
    kind: MediaKind;
    value: string;
    onChange: (url: string) => void;
    /** Used to name the object in the bucket — usually the lesson or song title. */
    nameHint: string;
    /** Fires after a video is probed, so the editor can fill duration and poster. */
    onVideoProbed?: (probe: VideoProbe, file: File) => void;
    hint?: string;
}

export default function MediaUpload({
    label,
    kind,
    value,
    onChange,
    nameHint,
    onVideoProbed,
    hint,
}: MediaUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const handleRef = useRef<UploadHandle | null>(null);

    const [progress, setProgress] = useState<number | null>(null);
    const [transferred, setTransferred] = useState(0);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [justFinished, setJustFinished] = useState(false);
    const [dragging, setDragging] = useState(false);

    const uploading = progress !== null;

    const handleFile = async (file: File) => {
        setError(null);
        setWarning(null);
        setJustFinished(false);

        if (file.size > LARGE_FILE_BYTES) {
            setWarning(
                `${formatBytes(file.size)}: this will be slow to upload and slow for learners to load. Consider compressing with scripts/upload-lesson-video.mjs first.`,
            );
        }

        // Probe before uploading: if the browser can't read the file, the admin
        // finds out in a second rather than after a 300MB upload.
        if (kind === "video" && onVideoProbed) {
            try {
                const probe = await probeVideo(file);
                onVideoProbed(probe, file);
            } catch (err: any) {
                setWarning(err.message + ". Uploading anyway, but check it plays.");
            }
        }

        setProgress(0);
        setTotal(file.size);

        const handle = uploadContentMedia(file, kind, nameHint || label, (percent, sent, size) => {
            setProgress(percent);
            setTransferred(sent);
            setTotal(size);
        });
        handleRef.current = handle;

        try {
            const url = await handle.done;
            onChange(url);
            setJustFinished(true);
            setTimeout(() => setJustFinished(false), 4000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setProgress(null);
            handleRef.current = null;
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-xs text-ink-400">{label}</span>

            <div className="flex gap-2">
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Upload a file, or paste a URL"
                    className="flex-1 font-mono text-xs"
                    disabled={uploading}
                />
                {value && !uploading && (
                    <a
                        href={value}
                        target="_blank"
                        rel="noreferrer noopener"
                        title="Open in a new tab"
                        className="shrink-0 flex items-center px-3 rounded-xl border border-ink-500 text-ink-400 hover:text-ink-100 transition-colors"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                )}
            </div>

            {uploading ? (
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-ink-850 border border-ink-600">
                    <div className="flex items-center gap-2">
                        <Spinner className="w-3.5 h-3.5" />
                        <span className="text-xs text-ink-200 tabular-nums">
                            {Math.round(progress!)}%
                        </span>
                        <span className="text-[11px] text-ink-500 tabular-nums">
                            {formatBytes(transferred)} of {formatBytes(total)}
                        </span>
                        <button
                            onClick={() => handleRef.current?.cancel()}
                            className="ml-auto text-[11px] text-ink-400 hover:text-red-300 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                    <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden">
                        <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-[11px] text-ink-500">
                        Uploading straight to Google Cloud Storage. Leaving this page cancels it.
                    </span>
                </div>
            ) : (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleFile(file);
                    }}
                    className={`flex items-center gap-2 p-3 rounded-xl border border-dashed transition-colors ${
                        dragging ? "border-green-500/60 bg-green-500/5" : "border-ink-600"
                    }`}
                >
                    <Button size="sm" onClick={() => inputRef.current?.click()}>
                        <Upload className="w-3.5 h-3.5" /> Choose file
                    </Button>
                    <span className="text-[11px] text-ink-500">or drop one here</span>
                    {justFinished && (
                        <span className="ml-auto text-[11px] text-green-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Uploaded
                        </span>
                    )}
                    <input
                        ref={inputRef}
                        type="file"
                        accept={ACCEPT[kind]}
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFile(file);
                        }}
                    />
                </div>
            )}

            {warning && (
                <p className="text-[11px] text-gold-300 flex items-start gap-1.5">
                    <TriangleAlert className="w-3 h-3 shrink-0 mt-0.5" />
                    {warning}
                </p>
            )}
            {error && (
                <p className="text-[11px] text-red-300 flex items-start gap-1.5">
                    <X className="w-3 h-3 shrink-0 mt-0.5" />
                    {error}
                </p>
            )}
            {hint && !warning && !error && <span className="text-[11px] text-ink-500">{hint}</span>}
        </div>
    );
}
