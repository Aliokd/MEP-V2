"use client";

/**
 * End-to-end encryption for direct messages between two connected songwriters.
 *
 * WHAT THIS DOES
 * Each account holds an ECDH P-256 key pair. The public half is published on
 * `publicProfiles/{uid}`; the private half never leaves the browser. Two people
 * derive the same AES-GCM key from their own private key and the other's public
 * key, and every message is encrypted with it before it is written. Firestore —
 * and anyone with database access, including us — stores only ciphertext and an
 * IV. There is no key on the server to decrypt with.
 *
 * WHAT THIS IS NOT
 * This is deliberately simple, and simple has costs. Read these before telling
 * anyone their messages are safe:
 *
 *  1. DEVICE-BOUND. The private key lives in this browser's IndexedDB and is
 *     never uploaded. Sign in on a second device and you get a *new* key pair —
 *     you cannot read any earlier message, and the other person's app will fail
 *     to decrypt yours until it re-reads your new public key. Clearing site data
 *     destroys the key and the history with it. There is no backup and no
 *     recovery, by construction.
 *
 *  2. NO FORWARD SECRECY. The key pair is static, so one compromised private key
 *     exposes every past message in that conversation. Signal's Double Ratchet
 *     is what solves this; it is a substantially larger piece of work.
 *
 *  3. TRUST ON FIRST USE. Nobody verifies that a public key really belongs to
 *     the person named beside it. Whoever controls the database could swap a
 *     public key and read everything from that point on. Real protection against
 *     that needs a fingerprint both people can compare out of band —
 *     `keyFingerprint()` below produces one, but no screen shows it yet.
 *
 *  4. METADATA IS NOT ENCRYPTED. Who talks to whom, how often, and when, is all
 *     plainly visible in Firestore. Only the message bodies are protected.
 *
 * The private key is created non-extractable, so script running on the page —
 * including injected script — can use it but cannot read it out and send it
 * somewhere. That is the one guarantee that survives an XSS.
 */

const DB_NAME = 'veinote-e2ee';
const DB_VERSION = 1;
const STORE = 'keys';

/** IndexedDB is keyed by uid so two accounts on one browser never share a key. */
function recordKey(uid: string): string {
    return `identity:${uid}`;
}

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE)) {
                request.result.createObjectStore(STORE);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function idbGet<T>(key: string): Promise<T | undefined> {
    return openDb().then((db) => new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const request = tx.objectStore(STORE).get(key);
        request.onsuccess = () => resolve(request.result as T | undefined);
        request.onerror = () => reject(request.error);
    }));
}

function idbPut(key: string, value: unknown): Promise<void> {
    return openDb().then((db) => new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    }));
}

export function isCryptoAvailable(): boolean {
    return typeof window !== 'undefined'
        && typeof indexedDB !== 'undefined'
        && typeof window.crypto?.subtle !== 'undefined';
}

// ── base64 ────────────────────────────────────────────────────────────────────

export function toBase64(bytes: ArrayBuffer): string {
    const view = new Uint8Array(bytes);
    let binary = '';
    // Chunked: spreading a large array into String.fromCharCode blows the stack.
    const CHUNK = 0x8000;
    for (let i = 0; i < view.length; i += CHUNK) {
        binary += String.fromCharCode(...view.subarray(i, i + CHUNK));
    }
    return btoa(binary);
}

export function fromBase64(value: string): Uint8Array {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

// ── identity key pair ─────────────────────────────────────────────────────────

interface StoredIdentity {
    privateKey: CryptoKey;
    publicKeyRaw: string;
}

const ECDH_PARAMS: EcKeyGenParams = { name: 'ECDH', namedCurve: 'P-256' };

/**
 * This browser's key pair for `uid`, generating and storing one on first call.
 *
 * Returns the public half as base64 so the caller can publish it. CryptoKey is
 * structured-cloneable, so the non-extractable private key is stored in
 * IndexedDB as-is — it is usable from this origin and unreadable everywhere
 * else, including by script on this page.
 */
export async function getOrCreateIdentity(uid: string): Promise<StoredIdentity> {
    const existing = await idbGet<StoredIdentity>(recordKey(uid));
    if (existing?.privateKey && existing.publicKeyRaw) return existing;

    const pair = await crypto.subtle.generateKey(ECDH_PARAMS, false, ['deriveBits']);
    const publicKeyRaw = toBase64(await crypto.subtle.exportKey('raw', pair.publicKey));

    const identity: StoredIdentity = { privateKey: pair.privateKey, publicKeyRaw };
    await idbPut(recordKey(uid), identity);
    return identity;
}

/** True when this browser already holds a key for `uid` — no key is created. */
export async function hasIdentity(uid: string): Promise<boolean> {
    const existing = await idbGet<StoredIdentity>(recordKey(uid));
    return Boolean(existing?.privateKey);
}

// ── shared key ────────────────────────────────────────────────────────────────

/**
 * The AES-GCM key for one conversation.
 *
 * ECDH gives both sides the same raw secret; HKDF stretches it into a key and
 * binds it to this conversation via `info`, so the same pair of identities used
 * for anything else in future cannot end up reusing this key.
 */
export async function deriveConversationKey(
    privateKey: CryptoKey,
    theirPublicKeyBase64: string,
    conversationId: string,
): Promise<CryptoKey> {
    const theirPublicKey = await crypto.subtle.importKey(
        'raw',
        fromBase64(theirPublicKeyBase64) as BufferSource,
        ECDH_PARAMS,
        false,
        [],
    );

    const sharedBits = await crypto.subtle.deriveBits(
        { name: 'ECDH', public: theirPublicKey },
        privateKey,
        256,
    );

    const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);

    return crypto.subtle.deriveKey(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            // Both sides derive the same value, so the salt cannot be a random
            // per-message value — the conversation id is the shared context.
            salt: new TextEncoder().encode('veinote-dm-v1'),
            info: new TextEncoder().encode(conversationId),
        },
        hkdfKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

// ── messages ──────────────────────────────────────────────────────────────────

export interface Sealed {
    ciphertext: string;
    iv: string;
}

/** A fresh 96-bit IV per message — reusing one under AES-GCM breaks the cipher. */
export async function seal(key: CryptoKey, plaintext: string): Promise<Sealed> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    return { ciphertext: toBase64(ciphertext), iv: toBase64(iv.buffer) };
}

/**
 * Returns null rather than throwing when a message can't be opened.
 *
 * That is a normal state, not an error: a message written from the other
 * person's previous device was encrypted to a key this browser never had. One
 * unreadable message must not take the whole thread down with it.
 */
export async function open(key: CryptoKey, sealed: Sealed): Promise<string | null> {
    try {
        const plaintext = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: fromBase64(sealed.iv) as BufferSource },
            key,
            fromBase64(sealed.ciphertext) as BufferSource,
        );
        return new TextDecoder().decode(plaintext);
    } catch {
        return null;
    }
}

/**
 * A short human-comparable fingerprint of a public key.
 *
 * Nothing renders this yet. It exists so that verifying a key out of band — the
 * mitigation for limitation 3 above — is a UI change rather than a crypto one.
 */
export async function keyFingerprint(publicKeyBase64: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', fromBase64(publicKeyBase64) as BufferSource);
    return Array.from(new Uint8Array(digest).slice(0, 8))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
        .replace(/(.{4})/g, '$1 ')
        .trim();
}
