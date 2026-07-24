import { doc, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import type { Language } from "@/context/LanguageContext";

interface CreateUserProfileOptions {
    answers?: Record<string, string>;
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

    fetch("/api/emails/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, locale: options.locale }),
    }).catch((err) => console.error("Failed to trigger welcome email:", err));
}
