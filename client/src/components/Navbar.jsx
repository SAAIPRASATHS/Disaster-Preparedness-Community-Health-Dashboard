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
        { to: '/home',            label: t('nav.riskCheck'),   show: true },
        { to: '/user-dashboard',  label: t('nav.myDashboard'), show: isAuthenticated && !isAdmin },
        { to: '/admin-dashboard', label: t('nav.adminPanel'),  show: isAdmin },
        { to: '/report',          label: t('nav.report'),      show: isAuthenticated },
        { to: '/map',             label: t('nav.map'),         show: true },
        { to: '/alerts',          label: t('nav.alerts'),      show: true },
        { to: '/bot',             label: t('nav.bot'),         show: true },
    ].filter((l) => l.show);

    const linkClass = ({ isActive }) =>
        `px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive
            ? 'bg-indigo-50 text-indigo-600'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
        }`;

    return (
        <nav
            className="fixed top-0 left-0 right-0 z-[100]"
            style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 4px 30px rgba(0,0,0,0.05)' }}
        >
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">

                {/* Brand */}
                <NavLink to="/" className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg text-white" style={{ background: 'var(--primary)' }}>
                        🛡️
                    </div>
                    <span className="font-extrabold text-lg text-slate-900 tracking-tight">DisasterPrep</span>
                </NavLink>

                {/* Desktop nav links */}
                <div className="hidden lg:flex items-center gap-1">
                    {links.map((link) => (
                        <NavLink key={link.to} to={link.to} className={linkClass}>{link.label}</NavLink>
                    ))}
                </div>

                {/* Right: language + user */}
                <div className="hidden lg:flex items-center gap-4">
                    <LanguageSwitcher />
                    {isAuthenticated ? (
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>
                                    {isAdmin ? t('common.admin') : t('common.citizen')}
                                </span>
                                <span className="text-sm font-bold text-slate-800 leading-tight">{user?.name}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                title={t('common.logout')}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <NavLink to="/citizen-login" className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors px-4 py-2">
                                {t('common.login')}
                            </NavLink>
                            <NavLink to="/register" className="premium-button text-sm py-2 px-5">
                                {t('common.register')}
                            </NavLink>
                        </div>
                    )}
                </div>

                {/* Mobile hamburger */}
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {mobileOpen
                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        }
                    </svg>
                </button>
            </div>

            {/* Mobile menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="lg:hidden border-t border-slate-100 bg-white"
                    >
                        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
                            {links.map((link) => (
                                <NavLink key={link.to} to={link.to} className={linkClass} onClick={() => setMobileOpen(false)}>
                                    {link.label}
                                </NavLink>
                            ))}
                            <div className="pt-3 border-t border-slate-100 mt-2 flex flex-col gap-3">
                                <LanguageSwitcher />
                                {isAuthenticated ? (
                                    <button onClick={handleLogout} className="w-full text-sm font-semibold text-rose-500 bg-rose-50 py-3 rounded-xl hover:bg-rose-100 transition-colors">
                                        {t('common.logout')}
                                    </button>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <NavLink to="/citizen-login" onClick={() => setMobileOpen(false)} className="text-center text-sm font-semibold text-slate-500 py-3">
                                            {t('common.login')}
                                        </NavLink>
                                        <NavLink to="/register" onClick={() => setMobileOpen(false)} className="premium-button text-center py-3">
                                            {t('common.register')}
                                        </NavLink>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
