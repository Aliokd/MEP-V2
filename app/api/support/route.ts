import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/email/send';
import { createInboxThread, verifyClaimedUser } from '@/lib/inbox';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, userName, userEmail, subject, message, locale } = body;

        if (!userEmail || !subject || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const caller = await verifyClaimedUser(request, userId || 'anonymous');

        // SupportModal used to write this doc straight from the client, but
        // firestore.rules had no match block for `support_tickets` at all, so every
        // write hit the default deny and no ticket was ever stored. The write now
        // happens here with the Admin SDK.
        let threadId: string | null = null;
        try {
            threadId = await createInboxThread({
                source: 'support',
                userId: caller.uid,
                userName: userName || 'Anonymous User',
                userEmail: caller.email || userEmail,
                subject,
                message,
                locale: locale || null,
                userAgent: request.headers.get('user-agent'),
                verified: caller.verified,
            });
        } catch (dbError) {
            // Losing the email too would leave the user with no path in at all,
            // so a storage failure is logged and the send still goes out.
            console.error('Error saving support ticket to Firestore:', dbError);
        }

        let emailText = `A new support request has been submitted from the Veinote platform.

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

        if (threadId) {
            emailText += `

Open in Veinote Admin: https://veinote.com/admin/inbox/support/${threadId}`;
        }

        emailText += `

(You can reply directly to this email to contact the user at ${userEmail}.)`;

        await sendMail({
            fromName: userName || 'Veinote User',
            replyTo: userEmail, // So replies go directly to the user who raised the ticket
            to: 'support@veinote.com',
            subject: `[Support Ticket] ${subject}`,
            text: emailText,
        });

        return NextResponse.json({ success: true, message: 'Email sent successfully', threadId });
    } catch (error: any) {
        console.error('Error sending support email:', error);
        return NextResponse.json({ error: error.message || 'Failed to send support email' }, { status: 500 });
    }
}
