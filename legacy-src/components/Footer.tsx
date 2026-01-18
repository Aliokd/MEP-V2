const Footer = () => {
    return (
        <footer className="py-24 px-6 md:px-12 border-t border-white/5 bg-charcoal text-center md:text-left">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-12">
                <div className="space-y-4">
                    <h2 className="text-2xl font-serif text-gold">THE CONSERVATORY</h2>
                    <p className="text-alabaster/40 text-sm font-sans max-w-xs leading-relaxed">
                        Revolutionizing music education through the synthesis of technology and timeless artistry.
                    </p>
                </div>

                <div className="flex gap-20">
                    <div className="space-y-4">
                        <h4 className="text-xs font-sans tracking-[0.3em] uppercase font-bold text-alabaster/80">Follow</h4>
                        <div className="flex flex-col gap-2 text-sm text-alabaster/40 font-sans">
                            <a href="#" className="hover:text-gold transition-colors">Instagram</a>
                            <a href="#" className="hover:text-gold transition-colors">YouTube</a>
                            <a href="#" className="hover:text-gold transition-colors">Twitter</a>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-xs font-sans tracking-[0.3em] uppercase font-bold text-alabaster/80">Legal</h4>
                        <div className="flex flex-col gap-2 text-sm text-alabaster/40 font-sans">
                            <a href="#" className="hover:text-gold transition-colors">Terms</a>
                            <a href="#" className="hover:text-gold transition-colors">Privacy</a>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto mt-24 flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-white/5">
                <p className="text-xs text-alabaster/20 font-sans uppercase tracking-[0.4em]">© 2026 THE CONSERVATORY. ALL RIGHTS RESERVED.</p>
                <p className="text-xs text-gold/40 font-serif italic tracking-[0.2em]">Made for those who listen.</p>
            </div>
        </footer>
    );
};

export default Footer;
