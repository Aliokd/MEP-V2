#!/usr/bin/env node
/**
 * Compresses a lesson video for web delivery, extracts its first frame as a
 * poster thumbnail, and uploads both to Firebase Storage under a public-read
 * path — then prints the URLs to paste into the admin CMS's "Video URL" /
 * "Poster URL" fields (Learn lesson editor).
 *
 *   node scripts/upload-lesson-video.mjs <input-file> <lesson-slug> [--skip-upload] [--skip-compress]
 *
 * Requires:
 *   - ffmpeg on PATH (unless --skip-compress)
 *   - GOOGLE_APPLICATION_CREDENTIALS pointing at a service account key with
 *     Firebase Storage access (skip this and pass --skip-upload to just
 *     preview the compression result locally)
 *
 * --skip-compress uploads <input-file> as-is — use this to upload a file that
 * was already compressed by a previous --skip-upload run, without re-encoding.
 * The poster is still (re-)extracted from it either way.
 *
 * What it does:
 *   1. Re-encodes the input to a web-optimized H.264/AAC mp4 (720p cap, faststart)
 *   2. Extracts the first frame as a JPEG poster (this became standard practice
 *      after the "Song structure" lesson shipped without one and showed a blank
 *      grey box until playback started — every lesson video should have one)
 *   3. Uploads both to content/lessons/ in the default bucket:
 *      {lesson-slug}.mp4 and {lesson-slug}-poster.jpg
 *   4. Sets a far-future Cache-Control header on both (the filename is the
 *      cache key — use a new slug if you need to replace a video that's
 *      already published, so cached copies don't serve stale content)
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { spawn } from "node:child_process";
import { mkdtemp, stat, rm, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const skipUpload = args.includes("--skip-upload");
const skipCompress = args.includes("--skip-compress");
const [inputPath, slug] = args.filter((a) => !a.startsWith("--"));

if (!inputPath || !slug) {
    console.error("Usage: node scripts/upload-lesson-video.mjs <input-file> <lesson-slug> [--skip-upload] [--skip-compress]");
    process.exit(1);
}

function formatMB(bytes) {
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function runFfmpeg(ffArgs) {
    return new Promise((resolve, reject) => {
        const proc = spawn("ffmpeg", ffArgs, { stdio: ["ignore", "inherit", "inherit"] });
        proc.on("error", reject);
        proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`))));
    });
}

async function compress(input, output) {
    // 720p cap, H.264 slow preset for better compression at a given quality,
    // CRF 23 (visually clean for talking-head/screen-capture lesson content),
    // AAC audio, +faststart so playback can start before the whole file downloads.
    // Explicit stream mapping: some .mov exports carry a second (thumbnail/cover)
    // video track alongside the real footage — without -map, ffmpeg's default
    // selection can be ambiguous, so pin it to the first video + audio stream.
    await runFfmpeg([
        "-y",
        "-i", input,
        "-map", "0:v:0",
        "-map", "0:a:0",
        "-vf", "scale='min(1280,iw)':-2",
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        output,
    ]);
}

async function extractPoster(input, output) {
    await runFfmpeg(["-y", "-i", input, "-vframes", "1", "-q:v", "3", output]);
}

const inputSize = (await stat(inputPath)).size;
console.log(`Input:  ${inputPath} (${formatMB(inputSize)})`);

const workDir = await mkdtemp(path.join(tmpdir(), "veinote-video-"));
const outputPath = path.join(workDir, `${slug}.mp4`);
const posterPath = path.join(workDir, `${slug}-poster.jpg`);

if (skipCompress) {
    console.log("--skip-compress set — uploading input as-is.");
    await copyFile(inputPath, outputPath);
} else {
    console.log("Compressing…");
    await compress(inputPath, outputPath);
}

const outputSize = (await stat(outputPath)).size;
console.log(`Output: ${outputPath} (${formatMB(outputSize)}, ${Math.round((1 - outputSize / inputSize) * 100)}% smaller)`);

console.log("Extracting poster frame…");
await extractPoster(outputPath, posterPath);

if (skipUpload) {
    const previewVideoPath = path.join(path.dirname(inputPath), `${slug}.compressed.mp4`);
    const previewPosterPath = path.join(path.dirname(inputPath), `${slug}-poster.jpg`);
    await copyFile(outputPath, previewVideoPath);
    await copyFile(posterPath, previewPosterPath);
    await rm(workDir, { recursive: true, force: true });
    console.log(`\n--skip-upload set — left for review:\n  ${previewVideoPath}\n  ${previewPosterPath}`);
    process.exit(0);
}

if (getApps().length === 0) {
    initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || "mep-v2",
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "mep-v2.firebasestorage.app",
    });
}

const bucket = getStorage().bucket();
const videoDestination = `content/lessons/${slug}.mp4`;
const posterDestination = `content/lessons/${slug}-poster.jpg`;

console.log(`Uploading to gs://${bucket.name}/${videoDestination} …`);
await bucket.upload(outputPath, {
    destination: videoDestination,
    metadata: { contentType: "video/mp4", cacheControl: "public, max-age=31536000, immutable" },
});

console.log(`Uploading to gs://${bucket.name}/${posterDestination} …`);
await bucket.upload(posterPath, {
    destination: posterDestination,
    metadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" },
});

await rm(workDir, { recursive: true, force: true });

const videoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(videoDestination)}?alt=media`;
const posterUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(posterDestination)}?alt=media`;
console.log("\nDone. Paste these into the lesson's fields in the admin CMS:\n");
console.log(`Video URL:  ${videoUrl}`);
console.log(`Poster URL: ${posterUrl}`);

process.exit(0);
