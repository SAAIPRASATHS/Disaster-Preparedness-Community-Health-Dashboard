import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function RoleSelect() {
    const { isAuthenticated, isAdmin } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    useEffect(() => {
        if (isAuthenticated) {
            navigate(isAdmin ? '/admin-dashboard' : '/user-dashboard', { replace: true });
        }
    }, [isAuthenticated, isAdmin, navigate]);

    const roles = [
        {
            key: 'citizen',
            icon: '👤',
            title: t('roleSelect.citizenTitle'),
            subtitle: t('roleSelect.citizenSubtitle'),
            gradient: 'from-emerald-500 to-teal-400',
            hoverGlow: 'hover:shadow-[0_8px_40px_rgba(76,175,130,0.3)]',
            path: '/citizen-login',
        },
        {
            key: 'admin',
            icon: '🔑',
            title: t('roleSelect.adminTitle'),
            subtitle: t('roleSelect.adminSubtitle'),
            gradient: 'from-primary to-blue-400',
            hoverGlow: 'hover:shadow-[0_8px_40px_rgba(92,122,234,0.3)]',
            path: '/admin-login',
        },
    ];

    return (
        <div className="min-h-[90vh] flex flex-col items-center justify-center px-6 relative overflow-hidden">
            {/* Background Accent Glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl -z-10" />

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center mb-16"
            >
                <div className="inline-block p-4 bg-white rounded-3xl shadow-xl shadow-slate-200/50 mb-8 transform hover:rotate-6 transition-transform cursor-default">
                    <span className="text-5xl block">🛡️</span>
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-4 tracking-tighter">
                    {t('roleSelect.title1')} <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">{t('roleSelect.title2')}</span>
                </h1>
                <p className="text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
                    {t('roleSelect.subtitle')}
                </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl w-full">
                {roles.map((role, i) => (
                    <motion.button
                        key={role.key}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 + i * 0.15 }}
                        onClick={() => navigate(role.path)}
                        className="glass-card p-10 text-left group relative overflow-hidden active:scale-[0.98]"
                    >
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:opacity-40 opacity-20 bg-gradient-to-br ${role.gradient}`} />

                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${role.gradient} flex items-center justify-center text-3xl mb-8 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                            {role.icon}
                        </div>

                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">{role.key} ACCESS</h3>
                        <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">{role.title}</h2>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">{role.subtitle}</p>

                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary group-hover:mr-2 transition-all">
                                {t('roleSelect.getStarted')}
                            </span>
                            <div className="w-8 h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                            <span className="text-primary group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </motion.button>
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-16 text-center"
            >
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">
                    {t('roleSelect.poweredBy')}
                </p>
                <div className="flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-900 tracking-widest">ECO-RESILIENCE NETWORK</span>
                </div>
            </motion.div>
        </div>
    );
}
