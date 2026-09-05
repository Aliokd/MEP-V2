import type { Metadata } from 'next';
import { resolveServerLocale } from '@/lib/server-locale';
import { getServerT } from '@/lib/i18n-content';
import { getCopyOverrides } from '@/lib/siteCopy';
import SiteFooterStrip from '@/components/SiteFooterStrip';
import { getPublishedPage, renderPageBody, renderMarkdownBody } from '@/lib/sitePages';
import { pickLocale } from '@/lib/content';

/**
 * Terms & Conditions.
 *
 * Same shape as /privacy: a published `site_pages/terms` CMS document wins so
 * the text can be edited without a deploy, and the copy embedded below is the
 * fallback that guarantees a legal page never 404s. The fallback is the
 * authoritative version as of TERMS_VERSION (lib/legalVersions.ts) — when this
 * text materially changes, bump that constant in the same commit so sign-ins
 * start re-recording acceptance.
 */

// English-only fallback. Localized versions live in the CMS document once
// published; until then every locale reads the English text rather than none.
const FALLBACK_TERMS_MD = `
## Introduction

These Terms & Conditions ("Terms") govern your use of veinote.com and the Veinote platform and services.

These Terms form a legal agreement between you and Veinote AB ("Veinote", "we", "us", "our"). By creating an account and accepting these Terms, you agree to be bound by them.

If you do not agree to these Terms, you should not create an account or use Veinote.

Nothing in these Terms limits any rights you may have under mandatory consumer protection laws.

## Eligibility

You must be at least 18 years old to create an account or use Veinote.

By creating an account, you confirm that you are at least 18 years old and have the legal capacity to enter into these Terms.

## Your account

You are responsible for providing accurate and up-to-date information when creating and using your Veinote account.

You are responsible for maintaining the confidentiality and security of your login credentials and for all activity that takes place through your account.

You must notify us promptly at support@veinote.com if you believe that your account has been accessed or used without your permission.

You may not create an account using false information, impersonate another person, or allow another person to use your account in a way that violates these Terms.

## Your content

You retain all ownership rights in any content you create, upload, store, or otherwise provide through Veinote. This includes lyrics, recordings, audio files, images, documents, notes, ideas, and other creative or project content.

Veinote does not claim ownership of your content.

By using Veinote, you grant us a limited, non-exclusive licence to host, store, reproduce, process, transmit, and display your content only as necessary to provide, maintain, secure, and support the service, including the collaboration and community features described below, where you choose to use them.

This licence does not give Veinote the right to sell, publish, commercially exploit, or otherwise use your private creative content for purposes unrelated to providing the service.

You are responsible for ensuring that you have the necessary rights to any content you upload to Veinote and that your content does not infringe the rights of others.

## Collaboration

Veinote lets you invite other users to work with you on a project. Collaborators you add to a project can view and work with the content in that project for as long as they are members of it.

The project owner controls the project, including who its members are.

When you invite a collaborator by email address, Veinote records the invitation against that address and delivers it. If the address is not yet registered with Veinote, the invitation can be claimed when its holder signs up.

You keep your ownership rights in anything you contribute to a shared project. So that a shared project can continue to work for its other members, content you have contributed may remain in the project if you later leave it or close your account. This does not transfer ownership of your contribution to anyone else.

## Publishing to the community

Veinote may include community features that let you publish a song or other content so that other Veinote users can see it. Content you do not publish stays private to you and the collaborators you have chosen.

When you publish content to the community:

- you grant Veinote the right to display the published content to other Veinote users for as long as it remains published;
- you confirm that you have the rights needed to publish it, including the agreement of any co-writers or other contributors;
- you understand that the published content (including the song, its lyrics, the names of its contributors, and any ownership split recorded for it) will be visible to other Veinote users.

Other users may view published content within Veinote. Publishing does not give anyone else the right to copy, distribute, or commercially exploit your content, and it does not transfer any ownership rights.

You can unpublish your content at any time, which removes it from the community. Where published content has been removed, by you or by us, we may retain a copy for a limited period where necessary to handle disputes, comply with legal obligations, or prevent repeated abuse, as described in our Privacy Policy.

We may remove or restrict access to published content that is reported to us or that we reasonably believe violates these Terms or applicable law.

## Collaboration splits

Veinote may provide tools that allow collaborators to record how they have agreed to divide ownership, songwriting shares, or other rights in a collaborative project.

The split function is intended primarily as a practical record and memory aid, helping collaborators keep track of what they agreed at the time of the collaboration. If you publish a project to the community, the recorded split may be displayed together with the published song.

Veinote is not a party to any agreement between collaborators and does not verify authorship, ownership, contribution, or the accuracy of any split entered on the platform.

A split recorded in Veinote is not intended to replace a formal collaboration, publishing, copyright, or other legal agreement. Veinote does not represent or guarantee that a recorded split will constitute a legally binding agreement in any particular jurisdiction.

Where ownership or rights are important or may become disputed, collaborators should consider documenting their agreement separately in an appropriate legally binding form.

## AI and your content

We do not use your private creative content to train AI models.

Some Veinote features use AI technology to provide practical tools and assistance. These may include scanning and extracting text, transcription, rhymes, spelling, language assistance, and similar functionality. When you use one of these features, the specific content involved is processed by our AI service provider to produce the result you asked for, as described in our Privacy Policy.

AI is used to support these tools and does not take ownership or authorship of your creative work. Everything you create in Veinote remains entirely yours.

Your lyrics, music, recordings, ideas, documents, and other private creative content are not used to train Veinote's own AI models or general-purpose AI models provided by third parties.

Where third-party AI services are used, we do not grant those providers the right to use your private creative content for model training.

## Acceptable use

You may use Veinote only for lawful purposes and in accordance with these Terms.

You must not use Veinote to:

- upload or share content that you do not have the right to use;
- infringe the intellectual property, privacy, or other rights of another person;
- upload malicious code, viruses, or other harmful material;
- attempt to gain unauthorised access to Veinote, other users' accounts, or our systems;
- interfere with, disrupt, or place an unreasonable load on the platform or its infrastructure;
- use automated systems to scrape, copy, or extract data from Veinote without our permission;
- impersonate another person or misrepresent your identity;
- use Veinote for fraudulent, illegal, or abusive activities.

We may take reasonable action where use of Veinote violates these Terms or applicable law, including restricting access to content or suspending or terminating an account where appropriate.

## Subscriptions, payments & billing

Veinote may offer free access, paid subscriptions, or other access plans. The features, prices, billing periods, and conditions applicable to each plan will be displayed before you subscribe.

Purchases are processed by our payment partner, Paddle, which acts as the merchant of record for the transaction. Paddle handles the payment and billing process, and its checkout terms and privacy policy apply to the payment transaction. Your card details are handled by Paddle and are never stored on Veinote's servers.

Paid subscriptions may be offered on a monthly or annual basis. Unless otherwise stated, subscriptions automatically renew at the end of each billing period until cancelled.

By purchasing a subscription, you authorise the applicable subscription fee and any applicable taxes to be charged through Paddle using your selected payment method.

Where required by applicable law, we will send you a reminder before your subscription renews, in good time for you to cancel before being charged for the next period.

## Cancellation

You can cancel your subscription at any time. Unless otherwise stated, cancellation takes effect at the end of your current paid billing period, and you will continue to have access to the paid features until that date.

Cancelling a subscription does not automatically delete your Veinote account or your creative content.

## Refunds and right of withdrawal

If you are a consumer, you may have a statutory right to withdraw from your purchase, including a 14-day right of withdrawal under applicable European consumer law. Information about this right, and how to exercise it, will be provided at the time of purchase as required by law.

Beyond any statutory right of withdrawal, payments are generally non-refundable once the applicable billing period has begun, except where required by applicable law or where otherwise stated at the time of purchase.

Nothing in these Terms limits any mandatory rights you have under applicable consumer protection law.

## Price changes

We may change subscription prices from time to time.

If a price change affects an existing paid subscription, we will provide reasonable advance notice before the new price takes effect. The new price will apply from a future renewal date, and you will have the opportunity to cancel your subscription before being charged the new price.

## Free access, trials & invited users

Veinote may offer free access, free trials, promotional access, discounted plans, or access provided through an invitation.

The features, duration, and conditions of this access may differ from those of a paid subscription and will be communicated when the access is offered.

Promotional or trial access may end automatically when the stated period expires. If a trial converts to a paid subscription, the price and billing terms will be clearly presented before you agree to the paid subscription, and we will remind you before the trial converts where required by applicable law.

Users who receive access through an invitation are still subject to these Terms and remain responsible for their own account and use of Veinote.

Veinote may change or discontinue free, trial, promotional, or invitation-based access, provided that this does not affect any rights already granted for a stated promotional period unless required for security, legal, or abuse-prevention reasons.

## Availability, changes & updates to the service

We work to keep Veinote available and reliable, but we do not guarantee that the service will always be available without interruptions, delays, errors, or technical problems.

We may update, improve, modify, add, or remove features as Veinote develops. We may also temporarily suspend parts of the service for maintenance, security, technical reasons, or circumstances outside our reasonable control.

Where a significant change materially affects a paid service you are using, we will provide reasonable notice where appropriate.

We will not intentionally remove access to your stored creative content without a valid reason, such as a legal requirement, security issue, violation of these Terms, or termination of your account.

## Account suspension & termination

You may stop using Veinote and close your account at any time.

While your account is active, Veinote allows you to export the files from your projects, including through our project download function, which provides your project files in a ZIP file. You may use this feature to keep your own backups or continue working with your files outside Veinote.

We may temporarily suspend or restrict an account where reasonably necessary to protect Veinote, its users, or third parties, including in cases of suspected misuse, security risks, unlawful activity, non-payment, or violations of these Terms.

We may terminate an account in cases of serious or repeated violations of these Terms, unlawful use of the service, significant security risks, or where we are required to do so by law.

Where reasonably possible, we will provide notice and an opportunity to resolve the issue before permanently terminating an account. Where appropriate and legally permitted, we will also provide a reasonable opportunity to export your creative content before access is permanently removed.

If immediate action is necessary for security, legal, fraud-prevention, or abuse-prevention reasons, we may suspend or restrict access without prior notice.

Closing or terminating an account does not transfer ownership of your creative content to Veinote. Your content remains yours.

After an account is closed or terminated, personal information and stored content will be handled in accordance with our Privacy Policy and applicable law.

## Veinote content and intellectual property

The Veinote platform and the materials provided through it are owned by Veinote or used under licence from the relevant rights holders.

This includes, where applicable, Veinote's software, source code, visual design, graphics, branding, logos, written content, educational materials, videos, exercises, databases, and other original materials made available as part of the service.

Some areas of Veinote, including the Practice and Learn sections, may also contain copyrighted music, songs, recordings, lyrics, videos, and other materials that Veinote has permission to make available.

Your subscription or access to Veinote gives you a limited right to use these materials within the Veinote platform for their intended purposes. It does not transfer any ownership or intellectual property rights to you.

Unless expressly permitted by Veinote or the relevant rights holder, you may not copy, reproduce, distribute, publish, extract, sell, license, or otherwise commercially exploit Veinote-provided or licensed materials outside the platform.

This does not apply to content that you create or upload yourself. Your own creative content remains yours as described in the section "Your content".

Nothing in these Terms restricts any use that is permitted by applicable law.

## Feedback

We welcome ideas, suggestions, and feedback about Veinote. If you choose to send us feedback, we may use it to improve the service without restriction and without any obligation or compensation to you.

Feedback does not include your creative content, which always remains yours as described in the section "Your content".

## Third-party services

Veinote relies on third-party services and technology to provide parts of the platform, including services for hosting, authentication, storage, analytics, payments, email delivery, and AI-assisted functionality.

Your use of certain features may therefore involve services provided by third parties. Where applicable, those services may also be subject to the provider's own terms and policies.

We are responsible for selecting and integrating third-party services with reasonable care, but we do not control their independent systems, availability, or operations.

If a third-party service becomes unavailable, changes its functionality, or is discontinued, we may need to modify or replace the affected Veinote feature.

Nothing in this section limits any rights you may have under applicable consumer protection law.

## Technical requirements & compatibility

Veinote is an online service and requires a compatible device, supported web browser, and internet connection.

Certain features may also require access to hardware or device functions such as a microphone, audio input or output, camera, or file storage, as well as permission from your device or browser to use those functions.

The availability and performance of individual features may vary depending on your device, browser, operating system, internet connection, and other technical factors.

We may update our technical requirements as Veinote develops. Current requirements and any important compatibility limitations will be made available through the platform or our website where relevant.

## Reporting illegal or infringing content

If you believe that content made available through Veinote is illegal, infringes your copyright or other intellectual property rights, or otherwise violates your rights, you can report it using the report function inside Veinote or by contacting us at support@veinote.com.

A report lets you tell us the reason and add a short description. Please provide enough information for us to identify the relevant content and understand the basis of your report.

We will review reports in accordance with applicable law and may remove or restrict access to content where appropriate.

If your content is removed or restricted following a report, we will inform you of the action taken and the reason, where we have a way to contact you and where the law does not prevent it. You can challenge a moderation decision by replying to that notice; appeals are reviewed by a person other than the one who made the original decision.

## Disclaimer and limitation of liability

We work to provide Veinote with reasonable care and to keep the service reliable and secure. However, we cannot guarantee that Veinote will always be uninterrupted, error-free, or available at all times.

Veinote is a creative and organisational tool. We do not guarantee any particular creative, professional, commercial, financial, or legal outcome from using the service.

To the extent permitted by applicable law, Veinote is not responsible for indirect or consequential losses resulting from the use of, or inability to use, the service.

We are not responsible for failures or interruptions caused by circumstances outside our reasonable control, including failures of internet services, devices, operating systems, or independent third-party services.

Nothing in these Terms excludes or limits liability where it cannot legally be excluded or limited, or limits any mandatory rights you may have under applicable consumer protection law.

## Changes to these Terms

We may update these Terms from time to time to reflect changes to Veinote, our services, applicable laws, or the way the platform operates.

If we make material changes that affect your rights or obligations, we will provide reasonable notice before the changes take effect, for example by email or through a notice within Veinote.

Where required by applicable law, you will have the right to terminate your subscription before a material change takes effect.

The effective date at the top of these Terms will show when the latest version became effective.

## Governing law and disputes

These Terms are governed by the laws of Sweden.

If you are a consumer, this choice of law does not deprive you of any mandatory consumer protection rights available to you under the laws of the country where you normally live.

If you have a complaint or dispute with Veinote, please contact us first at support@veinote.com so that we can try to resolve the matter directly.

Consumers may also have the right to submit eligible disputes to a consumer dispute resolution body. In Sweden, disputes may in certain cases be submitted to the Swedish National Board for Consumer Disputes (Allmänna reklamationsnämnden, ARN).

Any dispute that cannot be resolved otherwise may be brought before a court with jurisdiction under applicable law.

## Privacy

Your privacy is important to us.

Our collection and use of personal information in connection with Veinote is described in our Privacy Policy.

By using Veinote, you acknowledge that you have been provided with access to our Privacy Policy and understand that your personal information will be handled in accordance with that policy and applicable data protection law.

The Privacy Policy does not form part of these Terms except where expressly stated.

## General

These Terms, together with any additional terms expressly presented when you purchase or use a particular Veinote service or feature, form the agreement between you and Veinote regarding your use of the service.

If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will continue to apply.

If Veinote does not immediately enforce a provision of these Terms, this does not mean that we waive our right to enforce it later.

You may not transfer your Veinote account or your rights under these Terms to another person without our permission.

Veinote may transfer its rights and obligations under these Terms in connection with a merger, acquisition, restructuring, or transfer of the Veinote business, provided that this does not reduce any mandatory rights you have under applicable law.

Nothing in these Terms creates a partnership, employment, agency, or joint venture relationship between you and Veinote.

## Contact information

If you have questions about these Terms & Conditions, your account, subscription, or use of Veinote, you can contact us at:

Veinote AB\\
Registration number: [XXXXXX-XXXX]\\
Registered office: Stockholm, Sweden\\
Email: support@veinote.com
`;

export async function generateMetadata(): Promise<Metadata> {
    const { language } = await resolveServerLocale();
    const t = getServerT(language, await getCopyOverrides());

    const cmsPage = await getPublishedPage('terms');
    if (cmsPage) {
        return {
            title: `${pickLocale(cmsPage.title, language)} | Veinote`,
            description: pickLocale(cmsPage.description, language),
        };
    }

    return {
        title: `${t('terms.title')} | Veinote`,
        description: t('terms.effective_date'),
    };
}

export default async function TermsPage() {
    const { language } = await resolveServerLocale();
    const t = getServerT(language, await getCopyOverrides());
    const cmsPage = await getPublishedPage('terms');

    const title = cmsPage ? pickLocale(cmsPage.title, language) : t('terms.title');
    const subtitle = cmsPage ? pickLocale(cmsPage.description, language) : t('terms.effective_date');
    const bodyHtml = cmsPage ? renderPageBody(cmsPage, language) : renderMarkdownBody(FALLBACK_TERMS_MD);

    return (
        <div className="overflow-x-clip bg-[#E6E3DB] min-h-screen font-sans">
            <section className="pt-40 md:pt-48 pb-24 px-6 md:px-[10%]">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-sans text-stone-900 leading-[1.05] tracking-tight mb-4">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-sm text-stone-500 font-medium mb-16">{subtitle}</p>
                    )}

                    {/* Markdown rendered server-side with HTML disabled — same
                        hardened pipeline as every CMS page. */}
                    <div
                        className="site-page-body flex flex-col gap-4"
                        dangerouslySetInnerHTML={{ __html: bodyHtml }}
                    />
                </div>
            </section>

            <SiteFooterStrip language={language} currentPath="/terms" />
        </div>
    );
}
