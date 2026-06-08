import { useState, useEffect } from 'react';
import { submitReport, fetchReports } from '../api';
import { PageTransition, AnimatedCard } from '../components/Motion';
import { useToast } from '../components/Toast';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────
// Admin View — all user-submitted reports
// ─────────────────────────────────────────
const SYMPTOM_ICONS = {
    fever: '🌡️',
    cough: '😷',
    vomiting: '🤢',
    diarrhea: '💧',
    rash: '🔴',
    breathing_issue: '😮‍💨',
};

const SEVERITY_BY_COUNT = (n) => {
    if (n >= 4) return { label: 'Critical', cls: 'bg-rose-100 text-rose-700 border-rose-200' };
    if (n >= 2) return { label: 'Moderate', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
    return { label: 'Low', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
};

function AdminReportsView() {
    const { t } = useTranslation();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterSymptom, setFilterSymptom] = useState('all');
    const toast = useToast();

    useEffect(() => {
        fetchReports()
            .then(({ data }) => setReports(Array.isArray(data) ? data : []))
            .catch(() => toast.error('Failed to load reports'))
            .finally(() => setLoading(false));
    }, []);

    const allSymptoms = [...new Set(reports.flatMap((r) => r.symptoms || []))].sort();

    const filtered = reports.filter((r) => {
        const matchSearch =
            !search ||
            r.location?.toLowerCase().includes(search.toLowerCase()) ||
            r.userName?.toLowerCase().includes(search.toLowerCase());
        const matchSymptom =
            filterSymptom === 'all' || (r.symptoms || []).includes(filterSymptom);
        return matchSearch && matchSymptom;
    });

    return (
        <PageTransition>
            <div className="pt-8">
                {/* Header */}
                <div className="mb-10">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 mb-2"
                    >
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-primary/20">
                            🌡️
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                                {t('reportView.adminTitle1')} <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">{t('reportView.adminTitle2')}</span>
                            </h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                {t('reportView.totalCommReports', { count: reports.length })}
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: t('reportView.totalReports'), value: reports.length, icon: '📊', color: 'text-primary', bg: 'bg-blue-50' },
                        { label: t('reportView.uniqueLocations'), value: new Set(reports.map((r) => r.location)).size, icon: '📍', color: 'text-rose-600', bg: 'bg-rose-50' },
                        { label: t('reportView.today'), value: reports.filter((r) => new Date(r.createdAt).toDateString() === new Date().toDateString()).length, icon: '📅', color: 'text-amber-600', bg: 'bg-amber-50' },
                        { label: t('reportView.mostCommon'), value: allSymptoms[0] ? SYMPTOM_ICONS[allSymptoms[0]] + ' ' + allSymptoms[0].replace('_', ' ') : 'N/A', icon: '⚠️', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    ].map((s, i) => (
                        <AnimatedCard key={i} delay={i * 0.05}>
                            <div className="glass-card p-6 flex flex-col">
                                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center text-xl mb-3 shadow-inner`}>{s.icon}</div>
                                <p className={`text-2xl font-black ${s.color} tracking-tighter`}>{s.value}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
                            </div>
                        </AnimatedCard>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <input
                        type="text"
                        placeholder={t('reportView.searchLoc')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="premium-input flex-1 text-xs"
                    />
                    <select
                        value={filterSymptom}
                        onChange={(e) => setFilterSymptom(e.target.value)}
                        className="premium-input text-xs sm:w-52"
                    >
                        <option value="all">{t('reportView.allSymptoms')}</option>
                        {allSymptoms.map((s) => (
                            <option key={s} value={s}>{SYMPTOM_ICONS[s] || '🔹'} {s.replace('_', ' ')}</option>
                        ))}
                    </select>
                </div>

                {/* Reports list */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="animate-spin h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="glass-card p-16 text-center">
                        <span className="text-5xl block mb-4 opacity-30">🕵️</span>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('reportView.noReports')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((r, i) => {
                            const sev = SEVERITY_BY_COUNT(r.symptoms?.length || 0);
                            return (
                                <AnimatedCard key={r._id || i} delay={i * 0.03}>
                                    <div className="glass-card p-6 hover:shadow-lg transition-shadow">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-3 mb-3">
                                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full">
                                                        <span className="text-[10px]">📍</span>
                                                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{r.location}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full">
                                                        <span className="text-[10px]">👤</span>
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{r.userName || 'Citizen'}</span>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-400">
                                                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {(r.symptoms || []).map((s) => (
                                                        <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest shadow-sm">
                                                            <span>{SYMPTOM_ICONS[s] || '🔹'}</span>
                                                            {s.replace('_', ' ')}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className={`flex-shrink-0 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${sev.cls}`}>
                                                {sev.label}
                                            </div>
                                        </div>
                                    </div>
                                </AnimatedCard>
                            );
                        })}
                    </div>
                )}
            </div>
        </PageTransition>
    );
}

// ─────────────────────────────────────────
// Citizen View — submit a new report
// ─────────────────────────────────────────
function CitizenReportForm() {
    const { t } = useTranslation();

    const SYMPTOM_OPTIONS = [
        { id: 'fever',           label: t('report.fever') },
        { id: 'cough',           label: t('report.cough') },
        { id: 'vomiting',        label: t('report.vomiting') },
        { id: 'diarrhea',        label: t('report.diarrhea') },
        { id: 'rash',            label: t('report.rash') },
        { id: 'breathing_issue', label: t('report.breathingIssue') },
    ];

    const [location, setLocation]   = useState('');
    const [symptoms, setSymptoms]   = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult]       = useState(null);
    const [error, setError]         = useState('');
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
            <div className="max-w-6xl mx-auto pt-6 pb-12">

                {/* ── Hero Banner ── */}
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl md:rounded-3xl p-5 md:p-8 mb-6 md:mb-8 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #ec4899 100%)' }}
                >
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-green-300 text-xs font-semibold uppercase tracking-widest">Community Health Network Active</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-tight">
                                {t('report.title1')} <span className="text-yellow-300">{t('report.title2')}</span>
                            </h1>
                            <p className="text-indigo-100 text-sm font-medium leading-relaxed max-w-lg">
                                {t('report.subtitle')} Your anonymous report is analysed by our AI to detect outbreaks before they spread.
                            </p>
                        </div>
                        <div className="flex gap-4 flex-wrap">
                            {[
                                { num: '2 min', label: 'To Report' },
                                { num: '100%', label: 'Anonymous' },
                                { num: '24/7',  label: 'Monitored' },
                            ].map((s) => (
                                <div key={s.label} className="text-center px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                                    <p className="text-2xl font-extrabold text-white">{s.num}</p>
                                    <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* ── Two-column grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left — form + how-it-works */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Report Form */}
                        <AnimatedCard className="glass-card p-5 md:p-8">
                            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">🩺</span>
                                {t('reportView.formTitle')}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Location */}
                                <div>
                                    <label htmlFor="report-location" className="field-label">{t('report.location')}</label>
                                    <input
                                        id="report-location"
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder={t('report.locationPlaceholder')}
                                        className="premium-input"
                                    />
                                </div>

                                {/* Symptoms */}
                                <div>
                                    <label className="field-label">{t('report.symptoms')}</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {SYMPTOM_OPTIONS.map((s) => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => toggleSymptom(s.id)}
                                                className={`flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition-all duration-200 ${
                                                    symptoms.includes(s.id)
                                                        ? 'border-rose-500 bg-rose-500 text-white shadow-md shadow-rose-200'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50'
                                                }`}
                                            >
                                                <span className="text-sm font-semibold">{s.label}</span>
                                                {symptoms.includes(s.id) && <span className="text-base">✓</span>}
                                            </button>
                                        ))}
                                    </div>
                                    {symptoms.length > 0 && (
                                        <p className="text-xs text-rose-500 font-semibold mt-2">
                                            {symptoms.length} symptom{symptoms.length > 1 ? 's' : ''} selected
                                        </p>
                                    )}
                                </div>

                                {/* Error */}
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold flex items-center gap-3"
                                    >
                                        <span className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center text-xs font-bold">!</span>
                                        {error}
                                    </motion.div>
                                )}

                                <button
                                    id="submit-report-btn"
                                    type="submit"
                                    disabled={submitting}
                                    className="premium-button w-full py-3.5"
                                    style={{ background: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)', boxShadow: '0 4px 14px rgba(244,63,94,0.35)' }}
                                >
                                    {submitting ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                                            {t('reportView.transmitting')}
                                        </div>
                                    ) : (
                                        <span className="font-bold tracking-wide">{t('report.submitReport')}</span>
                                    )}
                                </button>
                            </form>
                        </AnimatedCard>

                        {/* Success */}
                        <AnimatePresence>
                            {result && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="glass-card p-5 md:p-6"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl">✅</div>
                                        <div>
                                            <p className="font-bold text-slate-900">{result.message}</p>
                                            <p className="text-sm text-slate-500">{t('reportView.anonSubmitted')}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('report.location')}</span>
                                            <span className="text-sm font-semibold text-slate-700">{result.report.location}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('report.symptoms')}</span>
                                            <span className="text-sm font-semibold text-slate-700">{result.report.symptoms.join(', ')}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* How It Works */}
                        <AnimatedCard className="glass-card p-5 md:p-8">
                            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">⚙️</span>
                                {t('reportView.howItWorks')}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { step: '01', icon: '📍', title: t('reportView.step1Title'), desc: t('reportView.step1Desc') },
                                    { step: '02', icon: '🩺', title: t('reportView.step2Title'), desc: t('reportView.step2Desc') },
                                    { step: '03', icon: '🛰️', title: t('reportView.step3Title'), desc: t('reportView.step3Desc') },
                                ].map((item) => (
                                    <div key={item.step} className="relative p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="absolute top-4 right-4 text-2xl font-extrabold text-slate-100">{item.step}</div>
                                        <div className="text-3xl mb-3">{item.icon}</div>
                                        <p className="font-bold text-slate-900 text-sm mb-1">{item.title}</p>
                                        <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </AnimatedCard>
                    </div>

                    {/* Right — info sidebar */}
                    <div className="space-y-6">

                        {/* Emergency notice */}
                        <motion.div
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 }}
                            className="rounded-2xl p-5 border-l-4 border-rose-500"
                            style={{ background: '#fff5f5' }}
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xl">🚨</span>
                                <p className="font-bold text-rose-700 text-sm">{t('reportView.whenToCall')}</p>
                            </div>
                            <ul className="space-y-2 text-xs text-rose-600 font-medium">
                                {[
                                    t('reportView.callTip1'),
                                    t('reportView.callTip2'),
                                    t('reportView.callTip3'),
                                    t('reportView.callTip4'),
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-2">
                                        <span className="mt-0.5 text-rose-400">→</span> {item}
                                    </li>
                                ))}
                            </ul>
                            <a href="tel:112" className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition-colors">
                                📞 {t('reportView.call112Now')}
                            </a>
                        </motion.div>

                        {/* Privacy */}
                        <motion.div
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="glass-card p-5"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xl">🔒</span>
                                <p className="font-bold text-slate-800 text-sm">{t('reportView.fullyAnon')}</p>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                {t('reportView.anonDesc')}
                            </p>
                        </motion.div>

                        {/* Health tips */}
                        <motion.div
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25 }}
                            className="glass-card p-5"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xl">💡</span>
                                <p className="font-bold text-slate-800 text-sm">{t('reportView.quickHealthTips')}</p>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { icon: '💧', tip: t('reportView.healthTip1') },
                                    { icon: '😷', tip: t('reportView.healthTip2') },
                                    { icon: '🏠', tip: t('reportView.healthTip3') },
                                    { icon: '🧼', tip: t('reportView.healthTip4') },
                                    { icon: '🌡️', tip: t('reportView.healthTip5') },
                                ].map((item) => (
                                    <div key={item.tip} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-lg flex-shrink-0">{item.icon}</span>
                                        <p className="text-xs text-slate-600 leading-relaxed">{item.tip}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Why it matters */}
                        <motion.div
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="rounded-2xl p-5"
                            style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f5e9 100%)', border: '1px solid #dde8ff' }}
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xl">🌍</span>
                                <p className="font-bold text-slate-800 text-sm">{t('reportView.whyItMatters')}</p>
                            </div>
                            <div className="space-y-2">
                                {[
                                    t('reportView.why1'),
                                    t('reportView.why2'),
                                    t('reportView.why3'),
                                    t('reportView.why4'),
                                ].map((point) => (
                                    <div key={point} className="flex items-center gap-2">
                                        <span className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] text-indigo-600 font-bold flex-shrink-0">✓</span>
                                        <p className="text-xs text-slate-600 font-medium">{point}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}

// ─────────────────────────────────────────
// Main export — role-aware
// ─────────────────────────────────────────
export default function Report() {
    const { isAdmin } = useAuth();
    return isAdmin ? <AdminReportsView /> : <CitizenReportForm />;
}
