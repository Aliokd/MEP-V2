export default function PlatformLoading() {
    return (
        <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center p-20">
            <div className="w-full max-w-lg space-y-12">
                {/* Title Placeholder */}
                <div className="space-y-4 text-center">
                    <div className="h-10 w-64 bg-white/5 rounded-xs mx-auto animate-pulse" />
                    <div className="h-3 w-32 bg-gold-900/40 rounded-xs mx-auto animate-pulse" />
                </div>

                {/* The Tuning Orchestra Effect */}
                <div className="flex items-center justify-center gap-2 h-64 border-y border-white/5 relative overflow-hidden">
                    {[...Array(24)].map((_, i) => (
                        <div
                            key={i}
                            className="w-1 bg-gold-500/20 rounded-full"
                            style={{
                                height: `${20 + Math.random() * 60}%`,
                                animation: `pulse-y ${1 + Math.random()}s ease-in-out infinite alternate`,
                                animationDelay: `${i * 0.1}s`
                            }}
                        />
                    ))}

                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-charcoal" />
                </div>

                <p className="text-center font-serif italic text-white/20 text-sm tracking-widest animate-pulse">
                    Tuning the Orchestra...
                </p>
            </div>
        </div>
    );
}
