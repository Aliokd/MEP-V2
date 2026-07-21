/**
 * Safe wrapper for localStorage.setItem that catches QuotaExceededError
 * and prevents client-side React crashes on browsers with restricted or full storage.
 */
export function safeLocalStorageSetItem(key: string, value: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (err) {
        console.warn(`[Storage] Failed to setItem for key "${key}":`, err);
        try {
            // Attempt cleanup of non-critical temporary cached keys
            const keysToRemove = ['mep-connect-posts-v4', 'mep_mock_remote_users', 'mep_mock_pending_invites'];
            keysToRemove.forEach(k => {
                if (k !== key) {
                    localStorage.removeItem(k);
                }
            });
            localStorage.setItem(key, value);
            return true;
        } catch (retryErr) {
            console.warn(`[Storage] Storage full for "${key}". Continuing without caching to local storage.`);
            return false;
        }
    }
}

export function safeLocalStorageGetItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return localStorage.getItem(key);
    } catch (err) {
        console.warn(`[Storage] Failed to getItem for key "${key}":`, err);
        return null;
    }
}
