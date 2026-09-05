/**
 * The invitation that lets someone past the closed signup, remembered for the
 * length of the tab.
 *
 * Onboarding checks an invite link with the server and, when it is good, opens
 * the account step. But the account can also come into being on the sign-in
 * page — an invitee who presses "Continue with Google" there instead — and that
 * page deletes any new account while signups are closed. So the good invite is
 * kept here, and the sign-in page asks for it before deciding a new account is
 * a trespasser. It is re-checked with the server on the way out, not trusted:
 * a value in sessionStorage is something anyone can put there.
 */
const KEY = 'veinote-invite-pass';

export function rememberInvitePass(inviteId: string): void {
    try { sessionStorage.setItem(KEY, inviteId); } catch { /* private mode, storage full — the flow still works without it */ }
}

export function forgetInvitePass(): void {
    try { sessionStorage.removeItem(KEY); } catch { /* nothing to forget */ }
}

/** True when a pending invitation is on record for this tab AND the server still vouches for it. */
export async function hasValidInvitePass(): Promise<boolean> {
    let id: string | null = null;
    try { id = sessionStorage.getItem(KEY); } catch { return false; }
    if (!id) return false;
    try {
        const res = await fetch(`/api/collab/invite/lookup?id=${encodeURIComponent(id)}`);
        if (!res.ok) return false;
        const data = await res.json();
        return data?.valid === true;
    } catch {
        return false;
    }
}
