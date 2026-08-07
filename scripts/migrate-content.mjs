#!/usr/bin/env node
/**
 * One-time migration of editorial content into Firestore.
 *
 *   node scripts/migrate-content.mjs           # dry run — prints what it would write
 *   node scripts/migrate-content.mjs --commit  # actually writes
 *
 * Sources:
 *   - Bank of Ideas  → app/platform/data/ideas.ts (three per-language arrays,
 *     merged into one doc per idea with localized fields)
 *   - Practice songs → app/platform/practice/data/songs.ts
 *   - Learn lessons  → left alone unless --lessons is passed; see the note below.
 *
 * Safe to re-run: every write is a merge keyed on a deterministic id, so running
 * it twice does not duplicate anything. Existing `status` values are preserved so
 * a re-run can't un-publish something an editor already shipped.
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { pathToFileURL } from "node:url";
import path from "node:path";

const commit = process.argv.includes("--commit");
const root = process.cwd();

if (getApps().length === 0) {
    initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || "mep-v2",
    });
}
const db = getFirestore();

const log = (...args) => console.log(commit ? "[write]" : "[dry ]", ...args);

/** Loads a .ts data module through Node's type stripping (Node 22+). */
async function loadTs(relativePath) {
    return import(pathToFileURL(path.join(root, relativePath)).href);
}

async function upsert(collection, id, data) {
    if (!commit) return;
    const ref = db.collection(collection).doc(id);
    const existing = await ref.get();
    // Never overwrite an editor's status/publish decisions on a re-run.
    const preserved = existing.exists
        ? {
              status: existing.data().status,
              publishAt: existing.data().publishAt ?? null,
          }
        : {};
    await ref.set(
        {
            ...data,
            ...preserved,
            migratedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
    );
}

async function migrateIdeas() {
    const { LYRICS_IDEAS_BY_LANGUAGE, MELODY_IDEAS_BY_LANGUAGE, VIBE_IDEAS_BY_LANGUAGE, CHORDS_IDEAS_BY_LANGUAGE } =
        await loadTs("app/platform/data/ideas.ts");

    // Each category's three language arrays share ids (lyrics-1 …, melody-1 …,
    // vibe-1 …, chords-1 …), so they merge into one document per idea carrying
    // all three languages.
    const byId = new Map();
    for (const byLanguage of [LYRICS_IDEAS_BY_LANGUAGE, MELODY_IDEAS_BY_LANGUAGE, VIBE_IDEAS_BY_LANGUAGE, CHORDS_IDEAS_BY_LANGUAGE]) {
        for (const [locale, ideas] of Object.entries(byLanguage)) {
            ideas.forEach((idea, index) => {
                const entry = byId.get(idea.id) || {
                    id: idea.id,
                    category: idea.category,
                    order: index,
                    status: "published",
                    title: {},
                    description: {},
                    whyItHelps: {},
                    example: {},
                };
                entry.title[locale] = idea.title;
                entry.description[locale] = idea.description;
                if (idea.whyItHelps) entry.whyItHelps[locale] = idea.whyItHelps;
                if (idea.example) entry.example[locale] = idea.example;
                byId.set(idea.id, entry);
            });
        }
    }

    for (const idea of byId.values()) {
        await upsert("ideas", idea.id, idea);
    }
    log(`ideas: ${byId.size} documents`);
}

async function migrateSongs() {
    const { SAMPLE_SONGS } = await loadTs("app/platform/practice/data/songs.ts");

    for (const [index, song] of SAMPLE_SONGS.entries()) {
        await upsert("practice_songs", song.id, {
            id: song.id,
            title: song.title,
            artist: song.artist,
            audioUrl: song.audioUrl,
            coverUrl: song.coverUrl || null,
            lyrics: song.lyrics,
            order: index,
            status: "published",
            // Deliberately blank: these are real commercial recordings and nobody
            // has recorded a licence for them yet. The CMS surfaces the gap.
            rights: { licence: null, holder: null, notes: "Imported from code — rights not yet recorded." },
        });
    }
    log(`practice_songs: ${SAMPLE_SONGS.length} documents`);
}

/**
 * Lessons still live in Data Connect. Pulling them out needs the Data Connect
 * SDK and a running connector, so it is opt-in rather than part of the default
 * run — an editor can also just author chapters and lessons directly in the CMS.
 */
async function migrateLessons() {
    const { getDataConnect } = await import("firebase/data-connect");
    const { initializeApp: initClient } = await import("firebase/app");
    const { connectorConfig, getUserConstellation } = await import("@mep/dataconnect");

    const clientApp = initClient({ projectId: process.env.FIREBASE_PROJECT_ID || "mep-v2" });
    const dc = getDataConnect(clientApp, connectorConfig);

    const { data } = await getUserConstellation(dc, { uid: "migration" });

    for (const [index, movement] of (data.movements || []).entries()) {
        await upsert("learn_chapters", movement.id, {
            id: movement.id,
            title: { en: movement.title },
            description: {},
            order: movement.order ?? index,
            status: "published",
        });
    }

    for (const [index, lesson] of (data.lessonsList || []).entries()) {
        await upsert("learn_lessons", lesson.id, {
            id: lesson.id,
            chapterId: lesson.movementId || null,
            title: { en: lesson.title },
            summary: {},
            videoUrl: lesson.videoUrl || "",
            midiDataUrl: lesson.midiDataUrl || null,
            durationSeconds: lesson.durationSeconds ?? 0,
            order: lesson.order ?? index,
            prerequisiteIds: (lesson.prerequisites || []).map((p) => p.prerequisiteId),
            status: "published",
        });
    }

    log(`learn_chapters: ${(data.movements || []).length}, learn_lessons: ${(data.lessonsList || []).length}`);
}

console.log(
    commit
        ? "Writing content to Firestore…"
        : "Dry run — nothing will be written. Re-run with --commit to apply.",
);

await migrateIdeas();
await migrateSongs();

if (process.argv.includes("--lessons")) {
    await migrateLessons().catch((err) => {
        console.error("Lesson migration failed (Data Connect unreachable?):", err.message);
    });
} else {
    console.log("Skipped lessons — pass --lessons to pull them from Data Connect.");
}

console.log(commit ? "Done." : "Dry run complete.");
process.exit(0);
