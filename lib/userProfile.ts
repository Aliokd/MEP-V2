import { doc, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { authedFetch } from "@/lib/authedFetch";
import { writePublicProfile } from "@/lib/publicProfile";
import type { Language } from "@/context/LanguageContext";

interface CreateUserProfileOptions {
    // One value per question, except the onboarding struggle deck, which can be
    // answered with several.
    answers?: Record<string, string | string[]>;
    locale?: Language;
    name?: string;
}

// Single entry point for creating a users/{uid} doc on signup, and the sole trigger point
// for the welcome email. Do NOT call this from self-heal/merge code paths (e.g. the
// create-canvas page's "ensure user doc exists" effect) — those run for existing users
// on every load and must not re-fire the welcome email.
export async function createUserProfile(user: User, options: CreateUserProfileOptions = {}): Promise<void> {
    const name = options.name ?? user.displayName ?? "Guest User";

    await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email: user.email || "",
        answers: options.answers || {},
        createdAt: new Date().toISOString(),
        tier: "trial",
        lastActiveAt: new Date().toISOString(),
        billing: {
            plan: null,
            paddleCustomerId: null,
            paddleSubscriptionId: null,
            subscriptionStatus: null,
            trialEndsAt: null,
            currentPeriodEnd: null,
            welcomeEmailSent: false,
            trialReminderSentAt: null,
        },
    });

    // The public slice of the account, mirrored so collaborator names and the
    // Connect roster can be read without users/{uid} being world-readable.
    await writePublicProfile(user.uid, {
        name,
        photoURL: user.photoURL || null,
        songwriterType: (options.answers?.songwriter_type as string) ?? null,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
    });

    // The route takes the uid from the verified token, not from this body — it
    // only ever sends the caller their own welcome email. authedFetch is what
    // supplies that token; a plain fetch here now gets a 401.
    authedFetch("/api/emails/welcome", {
        method: "POST",
        body: JSON.stringify({ locale: options.locale }),
    }).catch((err) => console.error("Failed to trigger welcome email:", err));
}
