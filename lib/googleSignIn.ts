import { getAdditionalUserInfo, signInWithCustomToken, signInWithPopup, type UserCredential } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebaseAuth';

/**
 * "Continue with Google", in one place for every screen that offers it.
 *
 * Production opens Google's popup. Development cannot: sign-in goes through
 * veinote.com (the authDomain), so on localhost the SDK's hidden auth frame
 * is a veinote.com page, which the local content security policy refuses to
 * frame, and the popup never reports back. Rather than loosen the policy for
 * a flow nobody needs to see on a laptop, development simulates it: a
 * dev-only route mints a session for a stand-in account and the caller
 * carries on exactly as if Google had answered. The branch is compiled out
 * of production builds, and the route answers 404 there.
 */
export interface GoogleSignInResult {
    credential: UserCredential;
    /** Whether this sign-in created the account (Google has no separate signup). */
    isNewUser: boolean;
}

export const GOOGLE_SIGN_IN_SIMULATED = process.env.NODE_ENV !== 'production';

/** What the popup's own dismissal looks like, so callers handle both paths alike. */
function closedError(): Error & { code: string } {
    return Object.assign(new Error('Simulated Google sign-in was cancelled'), { code: 'auth/popup-closed-by-user' });
}

export async function signInWithGoogle(options: { suggestedEmail?: string } = {}): Promise<GoogleSignInResult> {
    if (process.env.NODE_ENV !== 'production') {
        const email = window.prompt(
            'Simulated Google sign-in (development only).\nWhich account should Google hand back?',
            options.suggestedEmail || 'dev.google@veinote.test',
        );
        if (!email) throw closedError();

        const res = await fetch('/api/dev/google-sign-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || typeof data.token !== 'string') {
            throw Object.assign(new Error(data.error || 'simulated sign-in failed'), {
                code: data.error === 'not-a-simulated-account' ? 'auth/account-exists-with-different-credential' : 'auth/internal-error',
            });
        }
        const credential = await signInWithCustomToken(auth, data.token);
        return { credential, isNewUser: data.isNewUser === true };
    }

    const credential = await signInWithPopup(auth, googleProvider);
    return { credential, isNewUser: getAdditionalUserInfo(credential)?.isNewUser === true };
}
