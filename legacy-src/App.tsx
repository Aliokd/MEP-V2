import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Home from './marketing-pages/Home';
import Method from './marketing-pages/Method';
import Maestro from './marketing-pages/Maestro';
import Curriculum from './marketing-pages/Curriculum';
import SignIn from './marketing-pages/SignIn';
import SignUp from './marketing-pages/SignUp';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <ScrollToTop />
          <div className="min-h-screen bg-white dark:bg-charcoal text-stone-900 dark:text-alabaster selection:bg-gold/20 selection:text-gold flex flex-col transition-colors duration-300">
            <Navigation />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/method" element={<Method />} />
                <Route
                  path="/maestro"
                  element={
                    <ProtectedRoute>
                      <Maestro />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/curriculum"
                  element={
                    <ProtectedRoute>
                      <Curriculum />
                    </ProtectedRoute>
                  }
                />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}
