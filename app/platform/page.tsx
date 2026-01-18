import { getUserConstellation } from '@/app/actions/lesson-actions';
import ConstellationGraph from './components/ConstellationGraph';

export default async function PlatformPage() {
    // In a real app, you'd get the UID from the session/auth cookie
    const mockUid = "user_123";
    const data = await getUserConstellation(mockUid);

    return (
        <div className="relative min-h-screen">
            {/* Header Overlay */}
            <div className="absolute top-10 left-10 z-20">
                <h1 className="text-4xl font-serif text-alabaster tracking-tight mb-2">The Constellation</h1>
                <p className="text-gold-400 font-sans text-xs uppercase tracking-[0.3em] opacity-80">Your Path to Mastery</p>
            </div>

            {/* Stats Overlay */}
            <div className="absolute bottom-10 right-10 z-20 flex gap-10">
                <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Lessons Completed</p>
                    <p className="text-2xl font-serif text-alabaster tracking-tighter">12 / 48</p>
                </div>
                <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Current Movement</p>
                    <p className="text-2xl font-serif text-alabaster tracking-tighter">Foundation</p>
                </div>
            </div>

            <ConstellationGraph lessons={data.lessonsList} progress={data.user.lessonProgress} />
        </div>
    );
}
