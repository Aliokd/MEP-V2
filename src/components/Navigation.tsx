import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const Navigation = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navClasses = `glass-nav ${isScrolled || location.pathname !== '/' ? 'glass-nav-scrolled py-4' : 'py-8'}`;

    return (
        <nav className={`${navClasses} px-6 md:px-12 flex items-center justify-between transition-all duration-300`}>
            <Link to="/" className="flex items-center gap-2 group">
                <h1 className="text-2xl font-serif text-stone-900 dark:text-alabaster tracking-tighter group-hover:text-gold transition-colors">THE CONSERVATORY</h1>
            </Link>

            <div className="hidden md:flex items-center gap-12 text-sm uppercase tracking-widest text-stone-900/70 dark:text-alabaster/70 font-sans">
                <Link to="/method" className={`hover:text-gold transition-colors ${location.pathname === '/method' ? 'text-gold' : ''}`}>The Method</Link>
                <Link to="/maestro" className={`hover:text-gold transition-colors ${location.pathname === '/maestro' ? 'text-gold' : ''}`}>The Maestro</Link>
                <Link to="/curriculum" className={`hover:text-gold transition-colors ${location.pathname === '/curriculum' ? 'text-gold' : ''}`}>Curriculum</Link>
            </div>

            <div className="flex items-center gap-8">
                <ThemeToggle />
                <Link to="/signup" className="btn-outline text-xs tracking-[0.2em] uppercase py-3 px-6">
                    Audition Access
                </Link>
            </div>
        </nav>
    );
};

export default Navigation;
