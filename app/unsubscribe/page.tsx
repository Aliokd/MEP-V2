import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/firebaseAdmin";
import { unsubscribeToken } from "@/lib/email/campaigns";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Unsubscribe | Veinote",
    robots: { index: false, follow: false },
};

/**
 * One-click unsubscribe from campaign email.
 *
 * No sign-in required, by design: an unsubscribe link that demands a password is
 * the reason people press "spam" instead. The token in the URL is what proves
 * the request is genuine, so a stranger cannot unsubscribe someone else by
 * guessing their uid.
 *
 * This only stops campaign mail. Transactional messages — a reply to something
 * you wrote in about, a moderation notice about your own post — still send,
 * because switching those off would break the account rather than quieten it.
 */
export default async function UnsubscribePage({
    searchParams,
}: {
    searchParams: Promise<{ uid?: string; t?: string }>;
}) {
    const { uid, t } = await searchParams;

    let state: "done" | "invalid" | "error" = "invalid";

    if (uid && t && t === unsubscribeToken(uid)) {
        try {
            await adminDb.collection("users").doc(uid).set(
                { emailOptOut: true, emailOptOutAt: new Date().toISOString() },
                { merge: true },
            );
            state = "done";
        } catch (err) {
            console.error("[unsubscribe] Failed to record opt-out:", err);
            state = "error";
        }
    }

    return (
        <div className="min-h-screen bg-[#E6E3DB] font-sans flex items-center justify-center px-6">
            <div className="max-w-md w-full bg-white/60 border border-stone-300/60 rounded-[20px] p-8 flex flex-col gap-4">
                {state === "done" && (
                    <>
                        <h1 className="text-2xl font-light text-stone-800 tracking-tight">
                            You&apos;re unsubscribed
                        </h1>
                        <p className="text-sm text-stone-600 leading-relaxed">
                            We won&apos;t send you any more update emails. You&apos;ll still get
                            messages about things you started — a reply to something you wrote to us,
                            for instance — because those aren&apos;t marketing.
                        </p>
                        <p className="text-sm text-stone-600 leading-relaxed">
                            Changed your mind? Write to{" "}
                            <a href="mailto:support@veinote.com" className="underline underline-offset-4">
                                support@veinote.com
                            </a>{" "}
                            and we&apos;ll turn them back on.
                        </p>
                    </>
                )}

                {state === "invalid" && (
                    <>
                        <h1 className="text-2xl font-light text-stone-800 tracking-tight">
                            This link didn&apos;t work
                        </h1>
                        <p className="text-sm text-stone-600 leading-relaxed">
                            It may have been cut in half by your email app. Try opening it again from
                            the original message, or email{" "}
                            <a href="mailto:support@veinote.com" className="underline underline-offset-4">
                                support@veinote.com
                            </a>{" "}
                            and we&apos;ll unsubscribe you by hand.
                        </p>
                    </>
                )}

                {state === "error" && (
                    <>
                        <h1 className="text-2xl font-light text-stone-800 tracking-tight">
                            Something went wrong
                        </h1>
                        <p className="text-sm text-stone-600 leading-relaxed">
                            We couldn&apos;t record that just now. Please email{" "}
                            <a href="mailto:support@veinote.com" className="underline underline-offset-4">
                                support@veinote.com
                            </a>{" "}
                            and we&apos;ll take you off the list.
                        </p>
                    </>
                )}

                <Link
                    href="/"
                    className="text-sm text-stone-700 hover:text-stone-900 underline underline-offset-4 mt-2"
                >
                    Back to Veinote
                </Link>
            </div>
        </div>
    );
}
