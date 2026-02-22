import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../api';
import { useAuth } from '../context/AuthContext';
import { PageTransition, AnimatedCard } from '../components/Motion';
import { useToast } from '../components/Toast';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '', familyMembers: 4, elderly: 0, children: 0, conditions: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const { t } = useTranslation();

    const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
    const setNum = (key) => (e) => {
        const val = parseInt(e.target.value) || 0;
        setForm((p) => ({ ...p, [key]: key === 'familyMembers' ? Math.max(1, val) : val }));
    };
    const toggleCondition = (c) =>
        setForm((p) => ({ ...p, conditions: p.conditions.includes(c) ? p.conditions.filter((x) => x !== c) : [...p.conditions, c] }));

    const conditionOptions = ['diabetes', 'asthma', 'heart_disease', 'hypertension'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await registerUser(form);
            login(data.token, data.user);
            toast.success(t('register.accountCreated'));
            navigate('/user-dashboard');
        } catch (err) {
            const msg = err.response?.data?.error || t('register.registrationFailed');
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageTransition>
            <div className="min-h-[90vh] flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
                {/* Background Accent Glows */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

                <div className="text-center mb-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-block p-3 bg-white rounded-2xl shadow-lg border border-slate-100 mb-6"
                    >
                        <span className="text-3xl">📝</span>
                    </motion.div>
                    <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">{t('register.createAccount')}</h1>
                    <p className="text-slate-500 font-medium">{t('register.joinCommunity')}</p>
                </div>

                <AnimatedCard className="glass-card p-10 max-w-xl w-full relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-primary/10" />

                    <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{t('register.fullName')}</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={set('name')}
                                    required
                                    className="premium-input w-full"
                                    placeholder="Jane Doe"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{t('common.email')}</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={set('email')}
                                    required
                                    className="premium-input w-full"
                                    placeholder="jane@resilience.network"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{t('common.password')}</label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={set('password')}
                                    required
                                    minLength={6}
                                    className="premium-input w-full"
                                    placeholder={t('register.minChars')}
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-px flex-1 bg-slate-100" />
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">{t('register.familyProfile')}</span>
                                <div className="h-px flex-1 bg-slate-100" />
                            </div>

                            <div className="grid grid-cols-3 gap-6 mb-8">
                                {[
                                    { key: 'familyMembers', label: t('register.family'), icon: '👨‍👩‍👧‍👦' },
                                    { key: 'elderly', label: t('register.elderly'), icon: '👴' },
                                    { key: 'children', label: t('register.children'), icon: '👶' },
                                ].map((item) => (
                                    <div key={item.key}>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{item.label}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min={item.key === 'familyMembers' ? 1 : 0}
                                                value={form[item.key]}
                                                onChange={setNum(item.key)}
                                                className="premium-input w-full pl-10 pr-4 py-2.5 text-sm"
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm grayscale opacity-50">{item.icon}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {conditionOptions.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => toggleCondition(c)}
                                        className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all duration-300 ${form.conditions.includes(c)
                                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.05]'
                                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600'}`}
                                    >
                                        {c.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
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
                                    <span className="uppercase tracking-[0.2em] text-xs font-black">CREATING...</span>
                                </div>
                            ) : (
                                <span className="uppercase tracking-[0.2em] text-xs font-black">{t('register.createAccount')}</span>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-100/50 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {t('register.alreadyHaveAccount')}{' '}
                            <a href="/login" className="text-primary hover:underline ml-1 uppercase font-black">{t('login.signIn')}</a>
                        </p>
                    </div>
                </AnimatedCard>

                <div className="mt-12 text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] flex items-center gap-3">
                    <div className="w-8 h-px bg-slate-200" />
                    COMMUNITY NETWORK
                    <div className="w-8 h-px bg-slate-200" />
                </div>
            </div>
        </PageTransition>
    );
}
