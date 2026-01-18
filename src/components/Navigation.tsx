import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

const Navigation = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const location = useLocation();
    const { user } = useAuth();

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

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

            <div className="flex items-center gap-6">
                <ThemeToggle />
                {user ? (
                    <div className="flex items-center gap-6">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold">
                            {user.displayName || 'MAESTRO'}
                        </span>
                        <button
                            onClick={handleLogout}
                            className="text-[10px] uppercase tracking-[0.2em] text-stone-900/40 dark:text-alabaster/40 hover:text-stone-900 dark:hover:text-working transition-colors cursor-pointer"
                        >
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <Link to="/signup" className="btn-outline text-xs tracking-[0.2em] uppercase py-3 px-6">
                        Audition Access
                    </Link>
                )}
            </div>
        </nav>
    );
};

export default Navigation;
