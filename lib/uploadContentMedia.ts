"use client";

import { getDownloadURL, ref, uploadBytesResumable, type UploadTask } from "firebase/storage";
import { storage } from "@/lib/firebase";

/**
 * Uploads editorial media straight from the admin's browser to Firebase Storage.
 *
 * Deliberately not routed through a Next API route: Cloud Run caps request
 * bodies at 32MB and firebase.json sets a 120s timeout, so a lesson video simply
 * cannot be proxied through the backend. uploadBytesResumable chunks the file and
 * resumes after a dropped connection, which is what makes a 300MB upload over a
 * domestic connection survivable.
 *
 * Authorisation is the admin custom claim, checked in storage.rules — no signed
 * URL exchange, no server round trip before the upload starts.
 */

export type MediaKind = "video" | "poster" | "audio" | "image";

/** Where each kind lives in the bucket. Public-read under content/. */
const FOLDERS: Record<MediaKind, string> = {
    video: "content/lessons",
    poster: "content/lessons/posters",
    audio: "content/practice",
    image: "content/images",
};

export interface UploadHandle {
    /** Resolves to the public download URL once the upload completes. */
    done: Promise<string>;
    cancel: () => void;
}

function extensionFor(file: File): string {
    const fromName = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
    if (fromName && fromName.length <= 5) return fromName;
    if (file.type.startsWith("video/")) return "mp4";
    if (file.type.startsWith("audio/")) return "mp3";
    if (file.type.startsWith("image/")) return "jpg";
    return "bin";
}

/** Filesystem-safe stem derived from the lesson/song this media belongs to. */
function slugStem(hint: string): string {
    const cleaned = hint
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
    return cleaned || "untitled";
}

export function uploadContentMedia(
    file: File,
    kind: MediaKind,
    nameHint: string,
    onProgress: (percent: number, transferredBytes: number, totalBytes: number) => void,
): UploadHandle {
    // The filename carries a timestamp because these objects are served with a
    // far-future Cache-Control. Reusing a name would leave CDN and browser caches
    // serving the old file after a replacement — the exact trap the CLI script
    // warns about by telling you to pick a new slug by hand.
    const path = `${FOLDERS[kind]}/${slugStem(nameHint)}-${Date.now()}.${extensionFor(file)}`;

    const task: UploadTask = uploadBytesResumable(ref(storage, path), file, {
        contentType: file.type || undefined,
        // Immutable: the filename changes whenever the content does.
        cacheControl: "public, max-age=31536000, immutable",
    });

    const done = new Promise<string>((resolve, reject) => {
        task.on(
            "state_changed",
            (snapshot) => {
                const percent = snapshot.totalBytes
                    ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                    : 0;
                onProgress(percent, snapshot.bytesTransferred, snapshot.totalBytes);
            },
            (error) => {
                if (error.code === "storage/canceled") {
                    reject(new Error("Upload cancelled"));
                } else if (error.code === "storage/unauthorized") {
                    reject(
                        new Error(
                            "Storage rejected the upload. Your account needs the superadmin or editor role, and storage.rules must be deployed.",
                        ),
                    );
                } else {
                    reject(new Error(error.message || "Upload failed"));
                }
            },
            async () => {
                try {
                    resolve(await getDownloadURL(task.snapshot.ref));
                } catch (err: any) {
                    reject(new Error(err?.message || "Uploaded, but could not read the URL back"));
                }
            },
        );
    });

    return { done, cancel: () => task.cancel() };
}

export interface VideoProbe {
    durationSeconds: number;
    width: number;
    height: number;
    /** First readable frame, as a JPEG ready to upload as the poster. */
    poster: Blob | null;
}

/**
 * Reads duration and dimensions out of a video file and grabs a poster frame,
 * entirely in the browser.
 *
 * This is what removes the ffmpeg dependency for posters. Every lesson video
 * should have one — a lesson shipped without a poster shows a blank grey box
 * until playback starts, which is how the practice of extracting them started.
 */
export function probeVideo(file: File): Promise<VideoProbe> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;

        const fail = (message: string) => {
            URL.revokeObjectURL(url);
            reject(new Error(message));
        };

        // A file the browser can't decode (ProRes, HEVC in some browsers) would
        // otherwise hang here with no feedback.
        const timeout = setTimeout(() => fail("Could not read this video in the browser"), 20000);

        video.onerror = () => {
            clearTimeout(timeout);
            fail("This file isn't a video the browser can read");
        };

        video.onloadedmetadata = () => {
            // Seek a little way in: frame zero is often black on a fade-in.
            video.currentTime = Math.min(1, (video.duration || 2) / 4);
        };

        video.onseeked = () => {
            clearTimeout(timeout);
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const context = canvas.getContext("2d");
            if (!context) {
                URL.revokeObjectURL(url);
                resolve({
                    durationSeconds: Math.round(video.duration || 0),
                    width: video.videoWidth,
                    height: video.videoHeight,
                    poster: null,
                });
                return;
            }

            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                (blob) => {
                    URL.revokeObjectURL(url);
                    resolve({
                        durationSeconds: Math.round(video.duration || 0),
                        width: video.videoWidth,
                        height: video.videoHeight,
                        poster: blob,
                    });
                },
                "image/jpeg",
                0.82,
            );
        };

        video.src = url;
    });
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
