import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
    const { user, isAuthenticated, isAdmin, logout } = useAuth();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const { t } = useTranslation();

    const handleLogout = () => {
        logout();
        navigate('/');
        setMobileOpen(false);
    };

    const links = [
        { to: '/home', label: t('nav.riskCheck'), show: true },
        { to: '/user-dashboard', label: t('nav.myDashboard'), show: isAuthenticated && !isAdmin },
        { to: '/admin-dashboard', label: t('nav.adminPanel'), show: isAdmin },
        { to: '/report', label: t('nav.report'), show: isAuthenticated },
        { to: '/map', label: t('nav.map'), show: true },
        { to: '/alerts', label: t('nav.alerts'), show: true },
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
                    <span className="font-black text-xl bg-gradient-to-r from-primary via-blue-500 to-emerald-400 bg-clip-text text-transparent tracking-tight">
                        {t('nav.brand')}
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

                {/* Auth Section + Language Switcher */}
                <div className="hidden md:flex items-center gap-3">
                    <LanguageSwitcher />
                    <div className="h-6 w-px bg-gray-200 mx-1" />
                    {isAuthenticated ? (
                        <>
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${isAdmin ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                }`}>
                                {isAdmin ? `🔑 ${t('common.admin')}` : `👤 ${t('common.citizen')}`}
                            </span>
                            <span className="text-sm font-semibold text-slate-700">{user?.name}</span>
                            <button
                                onClick={handleLogout}
                                className="text-sm text-slate-500 hover:text-danger px-3 py-1.5 rounded-xl hover:bg-danger/5 transition-colors font-medium"
                            >
                                {t('common.logout')}
                            </button>
                        </>
                    ) : (
                        <>
                            <NavLink to="/citizen-login" className="text-sm text-slate-600 hover:text-primary px-4 py-2 rounded-xl hover:bg-primary/5 transition-colors font-semibold">
                                {t('common.login')}
                            </NavLink>
                            <NavLink to="/register" className="text-sm bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-all font-bold shadow-md shadow-primary/20 hover:shadow-lg active:scale-95">
                                {t('common.register')}
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
                            <div className="py-2"><LanguageSwitcher /></div>
                            <hr className="my-2 border-gray-100" />
                            {isAuthenticated ? (
                                <button onClick={handleLogout} className="w-full text-left text-sm text-danger px-3 py-2 rounded-xl hover:bg-red-50 font-medium">
                                    {t('common.logout')} ({user?.name})
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <NavLink to="/citizen-login" onClick={() => setMobileOpen(false)} className="flex-1 text-center text-sm text-primary px-3 py-2 rounded-xl border border-primary/20 font-medium">{t('common.login')}</NavLink>
                                    <NavLink to="/register" onClick={() => setMobileOpen(false)} className="flex-1 text-center text-sm bg-primary text-white px-3 py-2 rounded-xl font-semibold">{t('common.register')}</NavLink>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
