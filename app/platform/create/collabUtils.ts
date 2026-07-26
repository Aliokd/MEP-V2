import { db, auth } from "@/lib/firebase";
import {
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    addDoc,
    deleteDoc,
    getDocs,
    updateDoc,
    arrayRemove,
    serverTimestamp,
    writeBatch,
    Timestamp
} from "firebase/firestore";

// Total project membership cap, owner included.
export const MAX_PROJECT_MEMBERS = 5;
export const MAX_COLLABORATORS = MAX_PROJECT_MEMBERS - 1; // 4, excludes owner

// Interface matches SongNote from page.tsx
export interface CollaborativeProject {
    id: string;
    title: string;
    content: string;
    folderId: string | null;
    updatedAt: string;
    ownerId?: string;
    collaborators?: string[];
    verses?: any[];
    phrases?: any[];
    audioNotes?: any[];
    isAudioOnly?: boolean;
    isTitleLocked?: boolean;
    contributions?: {
        [userId: string]: {
            charactersTyped: number;
            linesCreated: number;
            recordingsAdded: number;
            lastActive: any;
        }
    };
}

/**
 * Migrates a user's private createNotes array from /users/{userId} to individual docs in /projects
 */
export async function migrateLegacyNotesToProjects(userId: string) {
    if (!auth.currentUser || auth.currentUser.uid !== userId) return;
    try {
        const userDocRef = doc(db, "users", userId);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) return;
        
        const userData = userDoc.data();
        const legacyNotes = userData.createNotes || [];
        const isMigrated = userData.notesMigratedToProjects || false;
        
        if (isMigrated || legacyNotes.length === 0) return;
        
        for (const note of legacyNotes) {
            try {
                const projectRef = doc(db, "projects", note.id);
                const projectData: CollaborativeProject = {
                    id: note.id,
                    title: note.title || "Untitled Song",
                    content: note.content || "",
                    folderId: note.folderId || null,
                    updatedAt: note.updatedAt || new Date().toLocaleString(),
                    ownerId: userId,
                    collaborators: [],
                    verses: note.verses || [],
                    phrases: note.phrases || [],
                    audioNotes: note.audioNotes || [],
                    isAudioOnly: note.isAudioOnly || false,
                    isTitleLocked: note.isTitleLocked || false,
                    contributions: {
                        [userId]: {
                            charactersTyped: (note.content || "").length,
                            linesCreated: (note.phrases || []).length,
                            recordingsAdded: (note.audioNotes || []).length,
                            lastActive: new Date().toISOString()
                        }
                    }
                };
                await setDoc(projectRef, projectData, { merge: true });
            } catch (noteErr) {
                console.warn(`Migration skipped for note ${note.id}:`, noteErr);
            }
        }
        
        // Mark user doc as migrated
        await setDoc(userDocRef, { 
            notesMigratedToProjects: true 
        }, { merge: true }).catch(err => console.warn("Migration status flag update skipped:", err));
    } catch (err) {
        console.warn("Migration skipped:", err);
    }
}

/**
 * Invites a collaborator by email. Finds user UID and adds them to collaborators list.
 */
export async function inviteCollaboratorByEmail(
    projectId: string, 
    email: string, 
    senderId: string, 
    senderName?: string
): Promise<{ success: boolean; message: string }> {
    try {
        const cleanedEmail = email.toLowerCase().trim();
        const projectRef = doc(db, "projects", projectId);
        const projectDoc = await getDoc(projectRef);
        const projectTitle = projectDoc.exists() ? (projectDoc.data()?.title || "Untitled Song") : "Untitled Song";

        // Query users collection for this email
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", cleanedEmail));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            // Non-existing user: create a pending invitation doc linked to their email
            const inviteId = `${projectId}_pending_${cleanedEmail.replace(/[@.]/g, '_')}`;
            const inviteRef = doc(db, "invitations", inviteId);
            
            await setDoc(inviteRef, {
                id: inviteId,
                projectId,
                projectTitle,
                senderId,
                senderName: senderName || "A collaborator",
                inviteeId: "", // will be claimed upon registration
                inviteeEmail: cleanedEmail,
                status: "pending",
                createdAt: new Date().toISOString()
            }, { merge: true });

            console.log(`Mock Email Service: Sent collaboration invitation email to ${cleanedEmail} for project "${projectTitle}" from ${senderName || "A collaborator"}`);

            return { 
                success: true, 
                message: `Invitation sent! An email has been sent to ${cleanedEmail}. Once they sign up, this project will appear in their workspace.` 
            };
        }
        
        const collaboratorId = querySnapshot.docs[0].id;
        
        // Check if already invited or is owner
        if (projectDoc.exists()) {
            const data = projectDoc.data();
            if (data.ownerId === collaboratorId) {
                return { success: false, message: "You cannot invite yourself as a collaborator." };
            }
            if (data.collaborators && data.collaborators.includes(collaboratorId)) {
                return { success: false, message: "This user is already a collaborator." };
            }
            if ((data.collaborators?.length || 0) >= MAX_COLLABORATORS) {
                return { success: false, message: "This project already has the maximum of 5 members." };
            }
        }
        
        
        // Create an invitation document in Firestore
        const inviteId = `${projectId}_${collaboratorId}`;
        const inviteRef = doc(db, "invitations", inviteId);
        
        await setDoc(inviteRef, {
            id: inviteId,
            projectId,
            projectTitle,
            senderId,
            senderName: senderName || "A collaborator",
            inviteeId: collaboratorId,
            inviteeEmail: cleanedEmail,
            status: "pending",
            createdAt: new Date().toISOString()
        }, { merge: true });
        
        return { success: true, message: "Invitation sent successfully! They will see a notification in their workspace." };
    } catch (err: any) {
        console.error("Error inviting collaborator:", err);
        return { success: false, message: err.message || "Failed to invite collaborator." };
    }
}

/**
 * Removes a collaborator from the project
 */
export async function removeCollaboratorFromProject(projectId: string, userId: string): Promise<boolean> {
    try {
        const projectRef = doc(db, "projects", projectId);
        await updateDoc(projectRef, {
            collaborators: arrayRemove(userId)
        });
        return true;
    } catch (err) {
        console.error("Error removing collaborator:", err);
        return false;
    }
}

/**
 * Fetches user profile info (name, photo) for collaborator list display
 */
export async function getCollaboratorProfiles(userIds: string[]): Promise<{[uid: string]: { name: string; email: string }}> {
    const profiles: {[uid: string]: { name: string; email: string }} = {};
    if (!userIds || userIds.length === 0) return profiles;
    try {
        // Firestore 'in' query has a limit of 30 items. If we have more, we can chunk them.
        const chunk = <T>(arr: T[], size: number): T[][] =>
            Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                arr.slice(i * size, i * size + size)
            );
        const chunks = chunk(userIds, 30);
        for (const chunkIds of chunks) {
            const q = query(collection(db, "users"), where("__name__", "in", chunkIds));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(docSnap => {
                const data = docSnap.data();
                profiles[docSnap.id] = {
                    name: data.displayName || data.name || "Collaborator",
                    email: data.email || ""
                };
            });
        }
    } catch (err) {
        console.error("Error fetching collaborator profiles:", err);
        // Fallback to individual fetches in case of errors
        for (const uid of userIds) {
            try {
                const userDoc = await getDoc(doc(db, "users", uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    profiles[uid] = {
                        name: data.displayName || data.name || "Collaborator",
                        email: data.email || ""
                    };
                }
            } catch (innerErr) {
                console.error("Error in fallback fetch for", uid, innerErr);
            }
        }
    }
    return profiles;
}

/**
 * Computes the relative contributions of each collaborator
 */
export function calculateContributionsPercentage(project: CollaborativeProject): { [uid: string]: number } {
    const totals = {
        charactersTyped: 0,
        linesCreated: 0,
        recordingsAdded: 0
    };
    
    const contribs = project.contributions || {};
    const uids = Object.keys(contribs);
    
    if (uids.length === 0) return {};
    
    // Calculate totals
    uids.forEach(uid => {
        const userStats = contribs[uid];
        totals.charactersTyped += userStats.charactersTyped || 0;
        totals.linesCreated += userStats.linesCreated || 0;
        totals.recordingsAdded += userStats.recordingsAdded || 0;
    });
    
    const percentages: { [uid: string]: number } = {};
    
    // Weights: Typing = 50%, Lines Created = 30%, Recordings = 20%
    const w1 = 0.5, w2 = 0.3, w3 = 0.2;
    
    uids.forEach(uid => {
        const stats = contribs[uid];
        
        const charRatio = totals.charactersTyped > 0 ? (stats.charactersTyped || 0) / totals.charactersTyped : 0;
        const lineRatio = totals.linesCreated > 0 ? (stats.linesCreated || 0) / totals.linesCreated : 0;
        const recRatio = totals.recordingsAdded > 0 ? (stats.recordingsAdded || 0) / totals.recordingsAdded : 0;
        
        // Combined score
        const score = (w1 * charRatio) + (w2 * lineRatio) + (w3 * recRatio);
        percentages[uid] = Math.round(score * 100);
    });

    return percentages;
}

/* ------------------------------------------------------------------------------------------
 * Project comments
 *
 * Comment bubbles anchored to the work itself — `anchorId` is a phrase id when the comment sits
 * on a lyric line, or null for a project-level note.
 *
 * These live in the `projects/{id}/comments` SUBcollection, never on the project document. The
 * whole project (lyrics, phrases, audioNotes carrying stemTracks, studioTracks) is a single doc
 * that every collaborator has an onSnapshot on, so anything stored there re-pushes the entire
 * project payload to every client on every write.
 * ---------------------------------------------------------------------------------------- */

export const MAX_COMMENT_LENGTH = 1000;

export interface ProjectComment {
    id: string;
    authorUid: string;
    authorName: string;
    text: string;
    anchorId: string | null;
    createdAt: number;
    resolved: boolean;
    resolvedBy?: string | null;
    resolvedAt?: number | null;
}

const toMillis = (value: any): number => {
    if (!value) return 0;
    if (value instanceof Timestamp) return value.toMillis();
    if (typeof value?.toMillis === 'function') return value.toMillis();
    if (typeof value === 'number') return value;
    return 0;
};

/**
 * Live subscription to a project's unresolved-and-resolved comments (newest first, capped).
 * Returns an unsubscribe function.
 */
export function subscribeToProjectComments(
    projectId: string,
    onChange: (comments: ProjectComment[]) => void,
    onError?: (err: Error) => void
): () => void {
    const q = query(
        collection(db, "projects", projectId, "comments"),
        orderBy("createdAt", "desc"),
        limit(200)
    );

    return onSnapshot(q, (snapshot) => {
        const comments: ProjectComment[] = snapshot.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                authorUid: data.authorUid || '',
                authorName: data.authorName || 'Collaborator',
                text: data.text || '',
                anchorId: data.anchorId ?? null,
                // serverTimestamp() reads back null on the author's own client until the write is
                // acknowledged — fall back so an optimistic comment still sorts sensibly.
                createdAt: toMillis(data.createdAt) || Date.now(),
                resolved: !!data.resolved,
                resolvedBy: data.resolvedBy ?? null,
                resolvedAt: toMillis(data.resolvedAt) || null
            };
        });
        onChange(comments);
    }, (err) => {
        console.warn("Comments snapshot error:", err.message);
        if (onError) onError(err);
    });
}

export async function addProjectComment(
    projectId: string,
    params: { authorUid: string; authorName: string; text: string; anchorId?: string | null }
): Promise<boolean> {
    const text = (params.text || '').trim();
    if (!text) return false;

    try {
        await addDoc(collection(db, "projects", projectId, "comments"), {
            authorUid: params.authorUid,
            authorName: params.authorName || 'Collaborator',
            text: text.slice(0, MAX_COMMENT_LENGTH),
            anchorId: params.anchorId ?? null,
            createdAt: serverTimestamp(),
            resolved: false,
            resolvedBy: null,
            resolvedAt: null
        });
        return true;
    } catch (err) {
        console.error("Error adding comment:", err);
        return false;
    }
}

/** Resolving is how a comment is dismissed — it keeps the canvas clean without destroying context. */
export async function resolveProjectComment(
    projectId: string,
    commentId: string,
    resolverUid: string
): Promise<boolean> {
    try {
        await updateDoc(doc(db, "projects", projectId, "comments", commentId), {
            resolved: true,
            resolvedBy: resolverUid,
            resolvedAt: serverTimestamp()
        });
        return true;
    } catch (err) {
        console.error("Error resolving comment:", err);
        return false;
    }
}

export async function deleteProjectComment(projectId: string, commentId: string): Promise<boolean> {
    try {
        await deleteDoc(doc(db, "projects", projectId, "comments", commentId));
        return true;
    } catch (err) {
        console.error("Error deleting comment:", err);
        return false;
    }
}

/**
 * Best-effort cleanup of a project's comment + presence subcollections.
 *
 * Firestore does NOT cascade-delete subcollections when the parent document is removed, so
 * without this every deleted project leaves its comments and presence docs orphaned forever.
 * Called before deleting the project doc itself.
 */
export async function deleteProjectSubcollections(projectId: string): Promise<void> {
    for (const sub of ["comments", "presence", "signaling"]) {
        try {
            const snap = await getDocs(collection(db, "projects", projectId, sub));
            // Firestore caps a batch at 500 writes.
            let batch = writeBatch(db);
            let pending = 0;
            for (const d of snap.docs) {
                batch.delete(d.ref);
                pending++;
                if (pending === 500) {
                    await batch.commit();
                    batch = writeBatch(db);
                    pending = 0;
                }
            }
            if (pending > 0) await batch.commit();
        } catch (err) {
            console.warn(`Cleanup of ${sub} subcollection skipped:`, err);
        }
    }
}
