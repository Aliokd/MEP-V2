import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/email/send';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, userName, userEmail, subject, message } = body;

        if (!userEmail || !subject || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Send the mail
        await sendMail({
            fromName: userName || 'Veinote User',
            replyTo: userEmail, // So replies go directly to the user who raised the ticket
            to: 'support@veinote.com',
            subject: `[Support Ticket] ${subject}`,
            text: `A new support request has been submitted from the Veinote platform.

User Details:
- Name: ${userName || 'N/A'}
- Email: ${userEmail}
- User ID: ${userId || 'N/A'}

Subject: ${subject}

Message:
------------------------------------------
${message}
------------------------------------------

(You can reply directly to this email to contact the user at ${userEmail}.)`,
        });

        return NextResponse.json({ success: true, message: 'Email sent successfully' });
    } catch (error: any) {
        console.error('Error sending support email:', error);
        return NextResponse.json({ error: error.message || 'Failed to send support email' }, { status: 500 });
    }
}
