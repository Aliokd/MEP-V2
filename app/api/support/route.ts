import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, userName, userEmail, subject, message } = body;

        if (!userEmail || !subject || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Configure Nodemailer transporter with One.com SMTP credentials
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'send.one.com',
            port: parseInt(process.env.SMTP_PORT || '465'),
            secure: true, // true for port 465
            auth: {
                user: process.env.SMTP_USER || 'support@veinote.com',
                pass: process.env.SMTP_PASS || 'scH$@@qk^BpkTi23s%JJ',
            },
        });

        // Set up email details
        const mailOptions = {
            from: `"${userName || 'Veinote User'}" <support@veinote.com>`, // Must be support@veinote.com for One.com sending authorization
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
        };

        // Send the mail
        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, message: 'Email sent successfully' });
    } catch (error: any) {
        console.error('Error sending support email:', error);
        return NextResponse.json({ error: error.message || 'Failed to send support email' }, { status: 500 });
    }
}
