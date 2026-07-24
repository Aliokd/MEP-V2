import Link from 'next/link';
import { ArrowRight, Heart } from 'lucide-react';

export const metadata = {
    title: 'About — Veinote',
    description: 'Veinote is the home of human songwriting. Learn about our mission, our team, and why we build for songwriters, not for AI.',
};

const PILLARS = [
    {
        title: 'Learn',
        desc: 'Bite-sized lessons and exercises that build real songwriting craft, one idea at a time.',
    },
    {
        title: 'Create',
        desc: 'A canvas built for lyrics, melodies, voice notes, and ideas to come together in one flow.',
    },
    {
        title: 'Practice',
        desc: 'Guided sessions that turn theory into muscle memory, so writing songs gets easier every time.',
    },
    {
        title: 'Connect',
        desc: 'A community of songwriters sharing work, feedback, and encouragement along the way.',
    },
];

export default function AboutPage() {
    return (
        <div className="overflow-x-clip bg-[#E6E3DB] min-h-screen font-sans">
            {/* Hero */}
            <section className="pt-40 md:pt-48 pb-20 px-6 md:px-[10%]">
                <div className="max-w-3xl">
                    <span className="text-stone-500 text-xs tracking-[0.2em] uppercase font-semibold">About Veinote</span>
                    <h1 className="mt-4 text-5xl md:text-7xl font-sans text-stone-900 leading-[1.05] tracking-tight">
                        The home of <span className="font-bold">human songwriting.</span>
                    </h1>
                    <p className="mt-8 text-base md:text-lg text-stone-600 leading-relaxed max-w-2xl">
                        No AI-generated songs. You create them. You own them. Veinote combines
                        creative tools, expert guidance, and a supportive community to help
                        songwriters actually finish what they start.
                    </p>
                    <Link
                        href="/onboarding"
                        className="mt-10 bg-[#86BE7F] hover:opacity-90 text-stone-900 px-8 py-4 rounded-[20px] text-lg font-semibold transition-all inline-flex items-center gap-3 select-none"
                    >
                        <span>Join now</span>
                        <ArrowRight className="w-5 h-5 stroke-[2.5px]" />
                    </Link>
                </div>
            </section>

            {/* Story */}
            <section className="px-6 md:px-[10%] pb-24 md:pb-32">
                <div className="max-w-2xl border-t border-stone-400/20 pt-16">
                    <h2 className="text-3xl md:text-4xl font-sans text-stone-900 tracking-tight mb-6">Why we built this</h2>
                    <div className="space-y-5 text-stone-600 leading-relaxed">
                        <p>
                            Most songwriters never finish their songs. Not from a lack of talent
                            or ideas, but because the process from first lyric to finished
                            recording has no clear path — and it's easy to lose momentum
                            somewhere in the middle.
                        </p>
                        <p>
                            Veinote was founded in 2026 in Stockholm by a small team of
                            songwriters and builders, including co-founder Peter Nordberg — a
                            platinum-selling, top 2% songwriter worldwide with over 30 years of
                            experience and 250+ released songs. His lessons, exercises, and
                            creative frameworks guide songwriters through every stage of the
                            platform.
                        </p>
                        <p>
                            We believe songwriting is a human craft. As AI-generated music
                            becomes more common, we're building the opposite: tools that help
                            you write, finish, and own songs that are genuinely yours.
                        </p>
                    </div>
                </div>
            </section>

            {/* Pillars */}
            <section className="px-6 md:px-[10%] pb-24 md:pb-32 border-t border-stone-400/20 pt-16">
                <h2 className="text-3xl md:text-4xl font-sans text-stone-900 tracking-tight mb-10">How Veinote works</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {PILLARS.map((pillar) => (
                        <div
                            key={pillar.title}
                            className="bg-white/40 border border-stone-300/40 rounded-[20px] p-6 flex flex-col gap-2"
                        >
                            <h3 className="text-lg font-semibold text-stone-900">{pillar.title}</h3>
                            <p className="text-sm text-stone-600 leading-relaxed">{pillar.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer strip */}
            <section className="px-6 md:px-[10%] pb-16 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-stone-400/20 pt-10">
                <div className="flex items-center gap-2 text-[14px] text-[#363636] font-medium bg-white/30 backdrop-blur-lg border border-white/40 px-5 py-2.5 rounded-full">
                    <Heart className="w-4 h-4 fill-[#363636] stroke-none shrink-0" />
                    <span>Designed by humans with love, in Stockholm.</span>
                </div>
                <div className="flex items-center gap-6 text-[14px] text-[#363636]">
                    <Link href="/privacy" className="hover:text-black transition-colors font-medium">Privacy Policy</Link>
                    <Link href="/#qa" className="hover:text-black transition-colors font-medium">Q&A</Link>
                    <Link href="/" className="hover:text-black transition-colors font-medium">Home</Link>
                </div>
            </section>
        </div>
    );
}
