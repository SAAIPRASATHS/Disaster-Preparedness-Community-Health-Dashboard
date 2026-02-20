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
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12"
            >
                <span className="text-6xl block mb-4">🛡️</span>
                <h1 className="text-4xl md:text-5xl font-extrabold text-dark mb-3">
                    {t('roleSelect.title1')} <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">{t('roleSelect.title2')}</span>
                </h1>
                <p className="text-secondary text-base md:text-lg max-w-lg mx-auto">
                    {t('roleSelect.subtitle')}
                </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full">
                {roles.map((role, i) => (
                    <motion.button
                        key={role.key}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
                        onClick={() => navigate(role.path)}
                        className={`group bg-white border-2 border-gray-200 rounded-2xl p-8 text-left shadow-card transition-all duration-300 hover:border-transparent hover:scale-[1.02] ${role.hoverGlow} active:scale-[0.98]`}
                    >
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${role.gradient} flex items-center justify-center text-3xl mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                            {role.icon}
                        </div>
                        <h2 className="text-xl font-bold text-dark mb-2">{role.title}</h2>
                        <p className="text-sm text-secondary leading-relaxed">{role.subtitle}</p>
                        <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            {t('roleSelect.getStarted')} <span className="text-lg">→</span>
                        </div>
                    </motion.button>
                ))}
            </div>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-10 text-xs text-secondary/60"
            >
                {t('roleSelect.poweredBy')}
            </motion.p>
        </div>
    );
}
