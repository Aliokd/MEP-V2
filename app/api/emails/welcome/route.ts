import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendMail } from "@/lib/email/send";
import { welcomeEmail } from "@/lib/email/templates/welcome";
import { resolveLocale } from "@/lib/email/locale";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { uid, locale } = body;

        if (!uid) {
            return NextResponse.json({ error: "Missing uid" }, { status: 400 });
        }

        const userRef = adminDb.doc(`users/${uid}`);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return NextResponse.json({ success: true, skipped: "user not found" });
        }

        const userData = userSnap.data() as {
            name?: string;
            email?: string;
            billing?: { welcomeEmailSent?: boolean };
        } | undefined;
        if (userData?.billing?.welcomeEmailSent) {
            return NextResponse.json({ success: true, skipped: "already sent" });
        }

        if (!userData?.email) {
            return NextResponse.json({ success: true, skipped: "no email on file" });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://veinote.com";
        const { subject, html, text } = welcomeEmail(resolveLocale(locale), {
            name: userData.name || "there",
            appUrl: `${appUrl}/platform/create`,
        });

        await sendMail({ to: userData.email, subject, html, text });

        await userRef.set({ billing: { welcomeEmailSent: true } }, { merge: true });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error sending welcome email:", error);
        return NextResponse.json({ error: error.message || "Failed to send welcome email" }, { status: 500 });
    }
}
