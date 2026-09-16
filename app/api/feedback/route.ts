import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/email/send';
import { createInboxThread, verifyClaimedUser } from '@/lib/inbox';
import { rateLimitGuard } from '@/lib/rateLimit';

// One address, no display-name syntax, no comments, no lists — the only shape a
// Reply-To from this form should ever have.
const EMAIL_SHAPE = /^[^\s@<>,;()"]+@[^\s@<>,;()"]+\.[^\s@<>,;()"]+$/;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, userName, userEmail, subject, message, attachmentUrl, attachmentName, locale } = body;

        if (!userEmail || !subject || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        // Shape and size checks before anything reaches the mailer. `userName`
        // becomes the From display name and `userEmail` the Reply-To, and this
        // route is reachable without an account — so an unbounded address list
        // here is the input nodemailer's addressparser is slowest on. The caps
        // are far above anything a person types into the feedback form.
        if (typeof userEmail !== 'string' || !EMAIL_SHAPE.test(userEmail) || userEmail.length > 254) {
            return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
        }
        if (typeof subject !== 'string' || subject.length > 200 || typeof message !== 'string' || message.length > 10_000) {
            return NextResponse.json({ error: 'Message is too long' }, { status: 400 });
        }
        if (userName !== undefined && userName !== null && (typeof userName !== 'string' || userName.length > 120)) {
            return NextResponse.json({ error: 'Name is too long' }, { status: 400 });
        }
        if (attachmentUrl !== undefined && attachmentUrl !== null && (typeof attachmentUrl !== 'string' || attachmentUrl.length > 2000)) {
            return NextResponse.json({ error: 'Attachment link is not valid' }, { status: 400 });
        }

        const caller = await verifyClaimedUser(request, userId || 'anonymous');

        // Keyed by account when there is one, by address when there is not —
        // the anonymous path is the one an abuser would use.
        const throttled = rateLimitGuard(request, 'feedback', caller.verified ? caller.uid : undefined);
        if (throttled) return throttled;

        // Persist first — this used to run through the *client* SDK from a server
        // route, so `request.auth` was null, the rule denied every write, and the
        // error was swallowed by a .catch(). No feedback was ever stored.
        let threadId: string | null = null;
        try {
            threadId = await createInboxThread({
                source: 'feedback',
                userId: caller.uid,
                userName: userName || 'Anonymous User',
                userEmail: caller.email || userEmail,
                subject,
                message,
                attachmentUrl,
                attachmentName,
                locale: locale || null,
                userAgent: request.headers.get('user-agent'),
                verified: caller.verified,
                claimedUid: caller.claimedUid,
            });
        } catch (dbError) {
            // Losing the email too would leave the user with no path in at all,
            // so a storage failure is logged and the send still goes out.
            console.error('Error saving feedback to Firestore:', dbError);
        }

        let emailText = `A new feedback message has been submitted from the Veinote platform.

User Details:
- Name: ${userName || 'N/A'}
- Email: ${caller.email || userEmail}
- User ID: ${caller.uid}
- Identity verified: ${caller.verified ? 'yes' : 'no'}

Subject: ${subject}

Message:
------------------------------------------
${message}
------------------------------------------`;

        if (attachmentUrl) {
            emailText += `

Attachment:
------------------------------------------
Link: ${attachmentUrl}
Name: ${attachmentName || 'Attached File'}
------------------------------------------`;
        }

        if (threadId) {
            emailText += `

Open in Veinote Admin: https://veinote.com/admin/inbox/feedback/${threadId}`;
        }

        emailText += `

(You can reply directly to this email to contact the user at ${userEmail}.)`;

        await sendMail({
            fromName: userName || 'Veinote User',
            replyTo: userEmail,
            to: 'support@veinote.com',
            subject: `[User Feedback] ${subject}`,
            text: emailText,
        });

        return NextResponse.json({ success: true, message: 'Feedback sent successfully', threadId });
    } catch (error: any) {
        console.error('Error sending feedback email:', error);
        return NextResponse.json({ error: error.message || 'Failed to send feedback email' }, { status: 500 });
    }
}
