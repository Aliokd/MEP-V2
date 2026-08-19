import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/email/send';
import { createInboxThread, verifyClaimedUser } from '@/lib/inbox';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, userName, userEmail, subject, message, attachmentUrl, attachmentName, locale } = body;

        if (!userEmail || !subject || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const caller = await verifyClaimedUser(request, userId || 'anonymous');

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
