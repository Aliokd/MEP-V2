import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, userName, userEmail, subject, message, attachmentUrl, attachmentName } = body;

        if (!userEmail || !subject || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Save feedback in Firestore collection "user_feedback"
        const feedbackData: any = {
            userId: userId || 'anonymous',
            userName: userName || 'Anonymous User',
            userEmail: userEmail,
            subject: subject.trim(),
            message: message.trim(),
            createdAt: new Date().toISOString(),
            status: 'received'
        };

        if (attachmentUrl) {
            feedbackData.attachmentUrl = attachmentUrl;
            feedbackData.attachmentName = attachmentName || 'Attached File';
        }
        
        try {
            await addDoc(collection(db, "user_feedback"), {
                ...feedbackData,
                createdAt: serverTimestamp()
            });
        } catch (dbError) {
            console.error('Error saving feedback to Firestore:', dbError);
            // Non-blocking db error, proceed to mail sending
        }

        // Configure Nodemailer transporter with SMTP credentials
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'send.one.com',
            port: parseInt(process.env.SMTP_PORT || '465'),
            secure: true,
            auth: {
                user: process.env.SMTP_USER || 'support@veinote.com',
                pass: process.env.SMTP_PASS || 'scH$@@qk^BpkTi23s%JJ',
            },
        });

        // Construct email body with conditional attachments info
        let emailText = `A new feedback message has been submitted from the Veinote platform.

User Details:
- Name: ${userName || 'N/A'}
- Email: ${userEmail}
- User ID: ${userId || 'N/A'}

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

        emailText += `

(You can reply directly to this email to contact the user at ${userEmail}.)`;

        // Set up email details
        const mailOptions = {
            from: `"${userName || 'Veinote User'}" <support@veinote.com>`,
            replyTo: userEmail,
            to: 'support@veinote.com',
            subject: `[User Feedback] ${subject}`,
            text: emailText
        };

        // Send the mail
        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, message: 'Feedback sent successfully' });
    } catch (error: any) {
        console.error('Error sending feedback email:', error);
        return NextResponse.json({ error: error.message || 'Failed to send feedback email' }, { status: 500 });
    }
}
