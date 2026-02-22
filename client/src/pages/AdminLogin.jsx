import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../api';
import { useAuth } from '../context/AuthContext';
import { PageTransition, AnimatedCard } from '../components/Motion';
import { useToast } from '../components/Toast';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function AdminLogin() {
    const { isAuthenticated, isAdmin, login } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isAuthenticated && isAdmin) {
            navigate('/admin-dashboard', { replace: true });
        } else if (isAuthenticated && !isAdmin) {
            navigate('/home', { replace: true });
        }
    }, [isAuthenticated, isAdmin, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await adminLogin({ email, password });
            login(data.token, data.user);
            toast.success(t('adminLogin.welcomeAdmin'));
            navigate('/admin-dashboard');
        } catch (err) {
            const msg = err.response?.data?.error || t('adminLogin.adminLoginFailed');
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
                <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-slate-900/5 rounded-full blur-3xl -z-10" />

                <div className="text-center mb-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-block p-4 bg-white rounded-3xl shadow-xl shadow-slate-200/50 mb-8 border border-slate-100"
                    >
                        <span className="text-4xl block">🔑</span>
                    </motion.div>
                    <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tighter uppercase">{t('adminLogin.adminAccess')}</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">{t('adminLogin.restricted')}</p>
                </div>

                <AnimatedCard className="glass-card p-10 max-w-md w-full relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-900/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-slate-900/10" />

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t('adminLogin.adminEmail')}</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="premium-input w-full"
                                placeholder="admin@resilience.network"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t('common.password')}</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="premium-input w-full"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="p-4 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
                            >
                                <span className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center text-[10px]">!</span>
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="premium-button w-full shadow-slate-900/20"
                            style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' }}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-3">
                                    <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                                    <span className="uppercase tracking-[0.2em] text-xs font-black">VALIDATING...</span>
                                </div>
                            ) : (
                                <span className="uppercase tracking-[0.2em] text-xs font-black">{t('adminLogin.adminSignIn')}</span>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-100/50 text-center relative z-10">
                        <a href="/login" className="text-[10px] font-black text-slate-400 hover:text-primary uppercase tracking-[0.2em] transition-colors">
                            {t('adminLogin.backToUser')}
                        </a>
                    </div>
                </AnimatedCard>

                <div className="mt-12 text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] flex items-center gap-3">
                    <div className="w-8 h-px bg-slate-200" />
                    AUTHORIZED PERSONNEL ONLY
                    <div className="w-8 h-px bg-slate-200" />
                </div>
            </div>
        </PageTransition>
    );
}
