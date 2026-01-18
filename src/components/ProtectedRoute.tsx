import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#050505]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                    <span className="text-gold text-xs tracking-[0.4em] uppercase font-bold animate-pulse">Establishing Connection</span>
                </div>
            </div>
        );
    }

    if (!user) {
        // Redirect to signin but save the location they were trying to access
        return <Navigate to="/signin" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
