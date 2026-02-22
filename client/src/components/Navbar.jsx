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
        `px-4 py-2 rounded-2xl text-[13px] font-black uppercase tracking-wider transition-all duration-300 ${isActive
            ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
        }`;

    return (
        <nav className="fixed top-0 left-0 right-0 z-[100] px-6 py-4 pointer-events-none">
            <div className="max-w-7xl mx-auto pointer-events-auto">
                <div className="bg-white/70 backdrop-blur-2xl border-2 border-white/40 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 px-8 flex items-center justify-between h-20">
                    {/* Logo */}
                    <NavLink to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:rotate-12 transition-transform duration-500">
                            <span className="text-xl text-white">🛡️</span>
                        </div>
                        <span className="font-black text-2xl text-slate-900 tracking-tighter">
                            {t('nav.brand')}
                        </span>
                    </NavLink>

                    {/* Desktop Links */}
                    <div className="hidden lg:flex items-center gap-2 bg-slate-50/50 p-1.5 rounded-[1.75rem] border border-slate-100">
                        {links.map((link) => (
                            <NavLink key={link.to} to={link.to} className={linkClass}>
                                {link.label}
                            </NavLink>
                        ))}
                    </div>

                    {/* Auth Section + Language Switcher */}
                    <div className="hidden lg:flex items-center gap-6">
                        <LanguageSwitcher />
                        <div className="h-4 w-px bg-slate-200" />

                        {isAuthenticated ? (
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isAdmin ? t('common.admin') : t('common.citizen')}</span>
                                    <span className="text-sm font-black text-slate-900">{user?.name}</span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all duration-300"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <NavLink to="/citizen-login" className="text-xs font-black text-slate-500 uppercase tracking-widest px-6 py-2 hover:text-primary transition-colors">
                                    {t('common.login')}
                                </NavLink>
                                <NavLink to="/register" className="premium-button bg-primary text-white shadow-primary/20">
                                    {t('common.register')}
                                </NavLink>
                            </div>
                        )}
                    </div>

                    {/* Mobile hamburger */}
                    <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden w-12 h-12 flex items-center justify-center bg-slate-50 rounded-2xl text-slate-600 hover:bg-slate-100 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {mobileOpen
                                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                            }
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="lg:hidden absolute top-28 left-6 right-6 pointer-events-auto"
                    >
                        <div className="glass-card bg-white/95 backdrop-blur-3xl rounded-[2.5rem] p-8 shadow-3xl border-2 border-white">
                            <div className="flex flex-col gap-4">
                                {links.map((link) => (
                                    <NavLink key={link.to} to={link.to} className={linkClass} onClick={() => setMobileOpen(false)}>
                                        {link.label}
                                    </NavLink>
                                ))}
                                <div className="pt-4 border-t border-slate-100 flex flex-col gap-6">
                                    <div className="flex justify-center"><LanguageSwitcher /></div>
                                    {isAuthenticated ? (
                                        <button onClick={handleLogout} className="premium-button bg-rose-500 text-white w-full uppercase py-4">
                                            {t('common.logout')}
                                        </button>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <NavLink to="/citizen-login" onClick={() => setMobileOpen(false)} className="text-center text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] py-4">{t('common.login')}</NavLink>
                                            <NavLink to="/register" onClick={() => setMobileOpen(false)} className="premium-button bg-primary text-white text-center py-4">{t('common.register')}</NavLink>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
