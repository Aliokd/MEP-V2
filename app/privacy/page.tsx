import Link from 'next/link';

export const metadata = {
    title: 'Privacy Policy — Veinote',
    description: 'How Veinote collects, uses, and protects your information.',
};

const SECTIONS = [
    {
        title: 'Introduction',
        body: `Veinote ("we", "us", "our") operates veinote.com and the Veinote platform. This
        policy explains what information we collect, how we use it, and the choices you
        have. By using Veinote, you agree to the practices described here.`,
    },
    {
        title: 'Information we collect',
        body: `We collect information you provide directly, such as your name, email address,
        and password when you create an account. We also store the content you create on
        Veinote — lyrics, voice recordings, images, documents, and project data — so it can
        be saved and shown back to you. We automatically collect basic usage data, such as
        which pages and features you use, to help us understand and improve the product.`,
    },
    {
        title: 'How we use your information',
        body: `We use your information to provide and maintain the platform, save and sync your
        songs and progress, respond to support requests and feedback, send account-related
        and product emails, and improve Veinote's features and reliability. We do not sell
        your personal information.`,
    },
    {
        title: 'Your content',
        body: `The lyrics, recordings, and other creative content you make in Veinote belong to
        you. We store it so you can access and edit it across sessions and devices, and we
        do not use your creative content to train AI models.`,
    },
    {
        title: 'Cookies & analytics',
        body: `We use essential cookies to keep you signed in and to remember basic preferences.
        We also use analytics tools, including Microsoft Clarity, to understand how the
        site is used so we can improve it. Analytics data is used in aggregate and is not
        sold to third parties.`,
    },
    {
        title: 'Third-party services',
        body: `Veinote relies on trusted third-party services to operate — including Firebase
        (authentication, database, and file storage) and email delivery providers for
        transactional messages. These providers process data on our behalf and are bound
        by their own privacy and security obligations.`,
    },
    {
        title: 'Data security',
        body: `We use industry-standard measures, including encrypted connections and access
        controls, to protect your information. No method of storage or transmission is
        completely secure, but we work to keep your data safe and to respond quickly if
        something goes wrong.`,
    },
    {
        title: 'Data retention & deletion',
        body: `We keep your account and content for as long as your account is active. You can
        request deletion of your account and associated data at any time by contacting us
        — see below.`,
    },
    {
        title: 'Your rights',
        body: `Depending on where you live, you may have the right to access, correct, export,
        or delete your personal information. To exercise any of these rights, contact us
        and we'll respond as quickly as we can.`,
    },
    {
        title: "Children's privacy",
        body: `Veinote is not directed at children under 13, and we do not knowingly collect
        personal information from children under 13.`,
    },
    {
        title: 'Changes to this policy',
        body: `We may update this policy from time to time. If we make material changes, we'll
        let you know by posting the updated policy here with a new effective date.`,
    },
    {
        title: 'Contact us',
        body: `Questions about this policy or your data? Reach us any time at
        support@veinote.com.`,
    },
];

export default function PrivacyPolicyPage() {
    return (
        <div className="overflow-x-clip bg-[#E6E3DB] min-h-screen font-sans">
            <section className="pt-40 md:pt-48 pb-24 px-6 md:px-[10%]">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-sans text-stone-900 leading-[1.05] tracking-tight mb-4">
                        Privacy Policy
                    </h1>
                    <p className="text-sm text-stone-500 font-medium mb-16">Effective July 2026</p>

                    <div className="flex flex-col">
                        {SECTIONS.map((section) => (
                            <div key={section.title} className="border-b border-stone-400/20 py-8">
                                <h2 className="text-lg font-semibold text-stone-900 mb-3">{section.title}</h2>
                                <p className="text-sm md:text-base text-stone-600 leading-relaxed whitespace-pre-line">
                                    {section.body}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="pt-10 flex items-center gap-6 text-[14px] text-[#363636]">
                        <Link href="/about" className="hover:text-black transition-colors font-medium">About</Link>
                        <Link href="/" className="hover:text-black transition-colors font-medium">Home</Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
