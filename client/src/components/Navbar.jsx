import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
    const { user, isAuthenticated, isAdmin, logout } = useAuth();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
        setMobileOpen(false);
    };

    const links = [
        { to: '/home', label: 'Risk Check', show: true },
        { to: '/user-dashboard', label: 'My Dashboard', show: isAuthenticated && !isAdmin },
        { to: '/admin-dashboard', label: 'Admin Panel', show: isAdmin },
        { to: '/report', label: 'Report', show: isAuthenticated },
        { to: '/map', label: 'Map', show: true },
        { to: '/alerts', label: 'Alerts', show: true },
    ].filter((l) => l.show);

    const linkClass = ({ isActive }) =>
        `px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
            ? 'bg-primary/15 text-primary shadow-sm'
            : 'text-secondary hover:text-dark hover:bg-gray-100'
        }`;

    return (
        <nav className="bg-white/90 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
                {/* Logo */}
                <NavLink to="/" className="flex items-center gap-2.5 group">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🛡️</span>
                    <span className="font-extrabold text-lg bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                        DisasterPrep
                    </span>
                </NavLink>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-1">
                    {links.map((link) => (
                        <NavLink key={link.to} to={link.to} className={linkClass}>
                            {link.label}
                        </NavLink>
                    ))}
                </div>

                {/* Auth Section */}
                <div className="hidden md:flex items-center gap-2">
                    {isAuthenticated ? (
                        <>
                            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${isAdmin ? 'bg-primary/15 text-primary' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                {isAdmin ? '🔑 Admin' : '👤 Citizen'}
                            </span>
                            <span className="text-sm text-secondary">{user?.name}</span>
                            <button
                                onClick={handleLogout}
                                className="text-sm text-secondary hover:text-danger px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors font-medium"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <NavLink to="/citizen-login" className="text-sm text-secondary hover:text-primary px-3 py-1.5 rounded-xl hover:bg-primary/10 transition-colors font-medium">
                                Login
                            </NavLink>
                            <NavLink to="/register" className="text-sm bg-primary text-white px-5 py-2 rounded-xl hover:bg-primary/90 transition-all font-semibold shadow-sm hover:shadow-md">
                                Register
                            </NavLink>
                        </>
                    )}
                </div>

                {/* Mobile hamburger */}
                <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-secondary p-2 rounded-xl hover:bg-gray-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {mobileOpen
                            ? <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            : <path strokeLinecap="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        }
                    </svg>
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="md:hidden overflow-hidden border-t border-gray-100"
                    >
                        <div className="px-4 py-3 space-y-1">
                            {links.map((link) => (
                                <NavLink key={link.to} to={link.to} className={linkClass} onClick={() => setMobileOpen(false)}>
                                    {link.label}
                                </NavLink>
                            ))}
                            <hr className="my-2 border-gray-100" />
                            {isAuthenticated ? (
                                <button onClick={handleLogout} className="w-full text-left text-sm text-danger px-3 py-2 rounded-xl hover:bg-red-50 font-medium">
                                    Logout ({user?.name})
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <NavLink to="/citizen-login" onClick={() => setMobileOpen(false)} className="flex-1 text-center text-sm text-primary px-3 py-2 rounded-xl border border-primary/20 font-medium">Login</NavLink>
                                    <NavLink to="/register" onClick={() => setMobileOpen(false)} className="flex-1 text-center text-sm bg-primary text-white px-3 py-2 rounded-xl font-semibold">Register</NavLink>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
