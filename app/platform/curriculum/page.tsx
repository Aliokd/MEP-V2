import { getUserConstellation, Lesson } from '@/app/actions/lesson-actions';
import { PlayCircle, CheckCircle2, Lock } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';


// Helper to format seconds
const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

export default async function PlatformCurriculumPage() {
    // In real app, get from session
    const mockUid = "user_123";
    const data = await getUserConstellation(mockUid);

    const groupedLessons: Record<string, Lesson[]> = {};
    const movementOrder = ["The Foundation", "The Fluency", "The Artistry"]; // Fixed order for now

    data.lessonsList.forEach(lesson => {
        const movementTitle = lesson.movement?.title || "Uncategorized";
        if (!groupedLessons[movementTitle]) {
            groupedLessons[movementTitle] = [];
        }
        groupedLessons[movementTitle].push(lesson);
    });

    return (
        <div className="space-y-12 text-stone-900 font-sans">
            <header className="space-y-4">
                <h1 className="text-4xl font-sans font-light tracking-tight text-stone-900">Curriculum</h1>
                <p className="text-stone-700 font-sans max-w-2xl text-sm font-medium">
                    Your structured path through the Synesthesia Engine. Master each movement to unlock the next level of perception.
                </p>
            </header>

            <div className="grid gap-8">
                {movementOrder.map((movementTitle, index) => {
                    const lessons = groupedLessons[movementTitle] || [];
                    if (lessons.length === 0) return null;

                    // Calculate module status
                    const totalLessons = lessons.length;
                    const completedLessons = lessons.filter(l =>
                        data.user.lessonProgress.find(p => p.lessonId === l.id && p.status === 'MASTERED')
                    ).length;
                    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

                    // Determine status
                    const isCompleted = progress === 100;
                    const isLocked = index > 0 && !movementOrder.slice(0, index).every(prevTitle => {
                        return true;
                    });

                    const visualStatus = isCompleted ? 'completed' : (progress > 0 ? 'in-progress' : 'locked');
                    const effectiveStatus = index === 0 ? (isCompleted ? 'completed' : 'in-progress') : visualStatus;

                    return (
                        <div
                            key={movementTitle}
                            className={`
                                relative overflow-hidden rounded-[16px] border p-8 transition-all duration-500
                                ${effectiveStatus === 'locked'
                                    ? 'bg-white/30 border-stone-200/80 opacity-60 grayscale'
                                    : 'bg-white/60 border-stone-200/80 hover:border-stone-400 shadow-xs'}
                            `}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold tracking-[0.2em] text-stone-700 uppercase">Module {(index + 1).toString().padStart(2, '0')}</span>
                                        {effectiveStatus === 'completed' && <CheckCircle2 size={16} className="text-stone-900" />}
                                        {effectiveStatus === 'locked' && <Lock size={16} className="text-stone-700/50" />}
                                    </div>
                                    <h2 className="text-2xl font-sans font-bold text-stone-900">{movementTitle}</h2>
                                    <p className="text-stone-700 text-sm font-medium">Mastering the {movementTitle.toLowerCase()} of sound.</p>
                                </div>

                                {effectiveStatus !== 'locked' && (
                                    <div className="text-right">
                                        <div className="text-3xl font-sans font-bold text-stone-900">{progress}%</div>
                                        <div className="text-[10px] uppercase tracking-widest text-stone-700 font-semibold">Complete</div>
                                    </div>
                                )}
                            </div>

                            {/* Progress Bar */}
                            <div className="h-1.5 w-full bg-stone-200/85 rounded-full overflow-hidden mb-8">
                                <div
                                    className="h-full bg-stone-900 transition-all duration-1000"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            {/* Lesson List Preview */}
                            <div className="space-y-3">
                                {lessons.map((lesson, i) => {
                                    const userProgress = data.user.lessonProgress.find(p => p.lessonId === lesson.id);
                                    const isMastered = userProgress?.status === 'MASTERED';
                                    const isStarted = userProgress?.status === 'STARTED';

                                    return (
                                        <Link href={`/platform/lesson/${lesson.id}`} key={lesson.id} className="block">
                                            <div className="flex items-center justify-between py-4 border-b border-stone-200/60 text-sm group cursor-pointer hover:bg-stone-200/30 px-4 -mx-4 transition-colors rounded-[8px]">
                                                <div className="flex items-center gap-4">
                                                    <PlayCircle size={18} className={`${isMastered ? 'text-stone-900' : 'text-stone-700/50'} group-hover:text-stone-900 transition-colors`} />
                                                    <span className={`font-sans font-medium ${isMastered || isStarted ? 'text-stone-900' : 'text-stone-700'}`}>{lesson.title}</span>
                                                </div>
                                                <span className="text-stone-700 text-xs font-mono font-medium">{formatDuration(lesson.durationSeconds)}</span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
