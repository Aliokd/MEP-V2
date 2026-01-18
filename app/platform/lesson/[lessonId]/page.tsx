import { getLessonDetails } from '@/app/actions/lesson-actions';
import SynesthesiaCanvas from '../../components/SynesthesiaCanvas';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default async function LessonPage({ params }: { params: { lessonId: string } }) {
    const lesson = await getLessonDetails(params.lessonId);

    return (
        <div className="flex flex-col h-screen bg-black">
            {/* Navbar / Header */}
            <header className="px-8 py-4 flex items-center justify-between border-b border-white/5 bg-charcoal/40 backdrop-blur-md">
                <Link href="/platform" className="text-white/40 hover:text-white flex items-center gap-2 transition-colors">
                    <ChevronLeft size={20} />
                    <span className="text-xs uppercase tracking-widest font-sans">Back to Constellation</span>
                </Link>

                <div className="text-center">
                    <p className="text-[10px] text-gold-500 uppercase tracking-[0.2em] mb-0.5">{lesson.movement?.title}</p>
                    <h2 className="text-alabaster font-serif text-lg">{lesson.title}</h2>
                </div>

                <div className="w-40" /> {/* Spacer for symmetry */}
            </header>

            {/* Top: Video Player (60vh) */}
            <div className="h-[60vh] bg-charcoal flex items-center justify-center relative group">
                <iframe
                    src={lesson.videoUrl}
                    className="w-full h-full border-none shadow-2xl"
                    allow="autoplay; fullscreen; picture-in-picture"
                    title={lesson.title}
                />

                {/* Playback Controls Overlay (Minimal) */}
                <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-6">
                        <div className="h-1 flex-grow bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gold-500 w-[35%]" />
                        </div>
                        <span className="text-[10px] text-white/40 font-mono">1:42 / 4:15</span>
                    </div>
                </div>
            </div>

            {/* Bottom: Synesthesia Canvas (40vh) */}
            <div className="h-[40vh] relative">
                <SynesthesiaCanvas midiDataUrl={lesson.midiDataUrl || undefined} />
            </div>
        </div>
    );
}
