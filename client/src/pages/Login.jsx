import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api';
import { useAuth } from '../context/AuthContext';
import { PageTransition, AnimatedCard } from '../components/Motion';
import { useToast } from '../components/Toast';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function Login() {
    const { isAuthenticated, isAdmin, login } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            navigate(isAdmin ? '/admin-dashboard' : '/home', { replace: true });
        }
    }, [isAuthenticated, isAdmin, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await loginUser({ email, password });
            login(data.token, data.user);
            toast.success(t('login.welcomeBackUser', { name: data.user.name }));
            navigate(data.user.role === 'admin' ? '/admin-dashboard' : '/user-dashboard');
        } catch (err) {
            const msg = err.response?.data?.error || t('login.loginFailed');
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageTransition>
            <div className="min-h-[85vh] flex flex-col items-center justify-center px-6 relative overflow-hidden">
                {/* Background Accent Glows */}
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10" />

                <div className="text-center mb-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-block p-3 bg-white rounded-2xl shadow-lg border border-slate-100 mb-6"
                    >
                        <span className="text-3xl">👤</span>
                    </motion.div>
                    <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">{t('login.welcomeBack')}</h1>
                    <p className="text-slate-500 font-medium">{t('login.signInSubtitle')}</p>
                </div>

                <AnimatedCard className="glass-card p-10 max-w-md w-full relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-primary/10" />

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t('common.email')}</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="premium-input w-full"
                                placeholder="name@resilience.network"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t('common.password')}</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="premium-input w-full"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
                            >
                                <span className="w-5 h-5 rounded-lg bg-rose-100 flex items-center justify-center text-[10px]">!</span>
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="premium-button w-full shadow-primary/20"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-3">
                                    <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                                    <span className="uppercase tracking-[0.2em] text-xs font-black">AUTHENTICATING...</span>
                                </div>
                            ) : (
                                <span className="uppercase tracking-[0.2em] text-xs font-black">{t('login.signIn')}</span>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-100/50 flex flex-col items-center gap-4 relative z-10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {t('login.noAccount')}{' '}
                            <a href="/register" className="text-primary hover:underline ml-1">{t('common.register')}</a>
                        </p>
                        <a href="/admin-login" className="text-[9px] font-black text-slate-300 hover:text-slate-500 uppercase tracking-[0.2em] transition-colors">
                            {t('login.adminLoginLink')}
                        </a>
                    </div>
                </AnimatedCard>

                <div className="mt-12 text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] flex items-center gap-3">
                    <div className="w-8 h-px bg-slate-200" />
                    SECURE HUB
                    <div className="w-8 h-px bg-slate-200" />
                </div>
            </div>
        </PageTransition>
    );
}
