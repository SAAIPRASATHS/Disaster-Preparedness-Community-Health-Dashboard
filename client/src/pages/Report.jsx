import { useState } from 'react';
import { submitReport } from '../api';
import { PageTransition, AnimatedCard } from '../components/Motion';
import { useToast } from '../components/Toast';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

export default function Report() {
    const { t } = useTranslation();

    const SYMPTOM_OPTIONS = [
        { id: 'fever', label: t('report.fever') },
        { id: 'cough', label: t('report.cough') },
        { id: 'vomiting', label: t('report.vomiting') },
        { id: 'diarrhea', label: t('report.diarrhea') },
        { id: 'rash', label: t('report.rash') },
        { id: 'breathing_issue', label: t('report.breathingIssue') },
    ];

    const [location, setLocation] = useState('');
    const [symptoms, setSymptoms] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const toast = useToast();

    const toggleSymptom = (id) =>
        setSymptoms((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!location.trim() || symptoms.length === 0) {
            setError(t('report.validationError'));
            return;
        }
        setSubmitting(true);
        setError('');
        setResult(null);

        try {
            const { data } = await submitReport({ location: location.trim(), symptoms });
            setResult(data);
            toast.success(t('report.reportSubmitted'));
            setLocation('');
            setSymptoms([]);
        } catch (err) {
            const msg = err.response?.data?.error || t('report.reportFailed');
            setError(msg);
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PageTransition>
            <div className="max-w-2xl mx-auto pt-8">
                <div className="text-center mb-12">
                    <motion.h1
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-black text-slate-900 mb-3 tracking-tight"
                    >
                        {t('report.title1')} <span className="bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">{t('report.title2')}</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-500 font-medium"
                    >
                        {t('report.subtitle')}
                    </motion.p>
                </div>

                <AnimatedCard className="glass-card p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-rose-500/10" />

                    <form onSubmit={handleSubmit} className="relative z-10">
                        <div className="mb-8">
                            <label htmlFor="report-location" className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                                {t('report.location')}
                            </label>
                            <input
                                id="report-location"
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder={t('report.locationPlaceholder')}
                                className="premium-input w-full"
                            />
                        </div>

                        <div className="mb-10">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                                {t('report.symptoms')}
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                {SYMPTOM_OPTIONS.map((s) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => toggleSymptom(s.id)}
                                        className={`flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all duration-300 group ${symptoms.includes(s.id)
                                            ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20'
                                            : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:shadow-sm'
                                            }`}
                                    >
                                        <span className="text-sm font-black tracking-tight uppercase leading-none">{s.label}</span>
                                        {symptoms.includes(s.id) && <span className="text-lg font-black tracking-tight leading-none">✓</span>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="mb-8 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
                            >
                                <span className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center text-xs">!</span>
                                {error}
                            </motion.div>
                        )}

                        <button
                            id="submit-report-btn"
                            type="submit"
                            disabled={submitting}
                            className="premium-button w-full shadow-rose-500/20"
                            style={{ background: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)' }}
                        >
                            {submitting ? (
                                <div className="flex items-center justify-center gap-3">
                                    <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                                    <span className="uppercase tracking-[0.2em] text-xs font-black">TRANSMITTING...</span>
                                </div>
                            ) : (
                                <span className="uppercase tracking-[0.2em] text-xs font-black">{t('report.submitReport')}</span>
                            )}
                        </button>
                    </form>
                </AnimatedCard>

                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="mt-8 glass-card p-8 border-emerald-500/20 shadow-emerald-500/5 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xl">✅</div>
                                <p className="text-sm font-black text-slate-900 uppercase tracking-widest">{result.message}</p>
                            </div>
                            <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('report.location')}</span>
                                    <span className="text-xs font-bold text-slate-700">{result.report.location}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('report.symptoms')}</span>
                                    <span className="text-xs font-bold text-slate-700">{result.report.symptoms.join(', ')}</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
}
