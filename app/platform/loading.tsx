export default function PlatformLoading() {
    return (
        <div className="w-full max-w-6xl mx-auto mt-0 mb-20 flex flex-col gap-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
                <div 
                    key={i} 
                    className="w-full border border-stone-200/60 rounded-[20px] p-6 bg-white/40 flex justify-between items-center"
                >
                    <div className="flex flex-col gap-2.5 w-full">
                        <div className="h-5 w-48 bg-stone-300/30 rounded-full" />
                        <div className="h-3.5 w-32 bg-stone-200/20 rounded-full" />
                    </div>
                    <div className="w-5 h-5 bg-stone-300/30 rounded-full" />
                </div>
            ))}
        </div>
    );
}

