import { getUserConstellation, Lesson, UserProgress } from '@/app/actions/lesson-actions';
import { PlayCircle, CheckCircle2, Lock } from 'lucide-react';
import Link from 'next/link';

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

    // Group lessons by movement
    // Note: In a real app, movements would be the primary structure, here we infer grouping or use movements list
    // The previous mock data structure for lessonsList had 'movement: { title: ... }'.
    // Let's grouping by movement title for display using the movements array order if possible, or just string key

    // We only have 1 movement in the mock 'movements' array from the previous file content view, but the lessons have movement titles.
    // Let's assume the mock data I just edited is consistent. The movements array was: [{ id: "m1", title: "Foundation", order: 1 }]
    // I should strictly rely on unique usage. I'll group by lesson.movement.title

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
        <div className="p-10 space-y-12 min-h-screen bg-charcoal text-alabaster">
            <header className="space-y-4">
                <h1 className="text-4xl font-serif text-alabaster">Curriculum</h1>
                <p className="text-stone-400 font-sans max-w-2xl">
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

                    // Determine status - simplistic logic based on progress
                    const isCompleted = progress === 100;
                    const isLocked = index > 0 && !movementOrder.slice(0, index).every(prevTitle => {
                        // Check previous module completion logic if we had full state, here simplify: 
                        // Check if first lesson of this module is locked?
                        // Let's assume unlocked if previous module > 0 progress or just hardcode based on mock
                        return true;
                    });

                    // Specific logic for mock data visualization
                    const visualStatus = isCompleted ? 'completed' : (progress > 0 ? 'in-progress' : 'locked');
                    // Override locked for first module always open
                    const effectiveStatus = index === 0 ? (isCompleted ? 'completed' : 'in-progress') : visualStatus;

                    return (
                        <div
                            key={movementTitle}
                            className={`
                                relative overflow-hidden rounded-xs border p-8 transition-all
                                ${effectiveStatus === 'locked'
                                    ? 'bg-white/5 border-white/5 opacity-60 grayscale'
                                    : 'bg-white/5 border-white/10 hover:border-gold-500/30'}
                            `}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold tracking-[0.2em] text-gold-500 uppercase">Module {(index + 1).toString().padStart(2, '0')}</span>
                                        {effectiveStatus === 'completed' && <CheckCircle2 size={16} className="text-green-500/80" />}
                                        {effectiveStatus === 'locked' && <Lock size={16} className="text-white/20" />}
                                    </div>
                                    <h2 className="text-2xl font-serif">{movementTitle}</h2>
                                    <p className="text-white/60 text-sm">Mastering the {movementTitle.toLowerCase()} of sound.</p>
                                </div>

                                {effectiveStatus !== 'locked' && (
                                    <div className="text-right">
                                        <div className="text-3xl font-serif text-gold-500">{progress}%</div>
                                        <div className="text-[10px] uppercase tracking-widest text-white/30">Complete</div>
                                    </div>
                                )}
                            </div>

                            {/* Progress Bar */}
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mb-8">
                                <div
                                    className="h-full bg-gold-500 transition-all duration-1000"
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
                                            <div className="flex items-center justify-between py-3 border-b border-white/5 text-sm group cursor-pointer hover:bg-white/5 px-4 -mx-4 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <PlayCircle size={18} className={`${isMastered ? 'text-gold-500' : 'text-white/20'} group-hover:text-gold-500 transition-colors`} />
                                                    <span className={isMastered || isStarted ? 'text-white' : 'text-white/60'}>{lesson.title}</span>
                                                </div>
                                                <span className="text-white/20 text-xs font-mono">{formatDuration(lesson.durationSeconds)}</span>
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
