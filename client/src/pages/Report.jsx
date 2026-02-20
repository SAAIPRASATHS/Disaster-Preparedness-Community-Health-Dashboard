import { useState } from 'react';
import { submitReport } from '../api';
import { PageTransition, AnimatedCard } from '../components/Motion';
import { useToast } from '../components/Toast';
import { useTranslation } from 'react-i18next';

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
            <div className="max-w-xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-dark mb-2">
                        {t('report.title1')} <span className="bg-gradient-to-r from-danger to-red-400 bg-clip-text text-transparent">{t('report.title2')}</span>
                    </h1>
                    <p className="text-secondary text-sm">
                        {t('report.subtitle')}
                    </p>
                </div>

                <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-7 shadow-card">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-5">
                            <label htmlFor="report-location" className="block text-sm font-semibold text-dark mb-1.5">
                                {t('report.location')}
                            </label>
                            <input
                                id="report-location"
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder={t('report.locationPlaceholder')}
                                className="w-full bg-surface border border-gray-200 rounded-xl px-4 py-3 text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-danger/30 focus:border-danger transition"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-dark mb-2">{t('report.symptoms')}</label>
                            <div className="grid grid-cols-2 gap-3">
                                {SYMPTOM_OPTIONS.map((s) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => toggleSymptom(s.id)}
                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${symptoms.includes(s.id)
                                            ? 'bg-red-50 border-danger text-danger scale-[1.02] shadow-sm'
                                            : 'bg-white border-gray-200 text-secondary hover:border-gray-300'
                                            }`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 bg-red-50 border-2 border-risk-high/20 text-risk-high px-4 py-2.5 rounded-xl text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            id="submit-report-btn"
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-danger hover:bg-danger/90 disabled:bg-gray-300 text-white font-semibold py-3.5 rounded-2xl transition-all duration-200 shadow-card hover:shadow-card-hover active:scale-[0.98]"
                        >
                            {submitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                    {t('report.submitting')}
                                </span>
                            ) : t('report.submitReport')}
                        </button>
                    </form>
                </AnimatedCard>

                {result && (
                    <AnimatedCard className="mt-6 bg-emerald-50 border-2 border-risk-low/30 text-emerald-800 px-5 py-4 rounded-2xl">
                        <p className="font-semibold mb-1">✅ {result.message}</p>
                        <p className="text-sm text-secondary">
                            {t('report.location')}: {result.report.location} · {t('report.symptoms')}: {result.report.symptoms.join(', ')}
                        </p>
                    </AnimatedCard>
                )}
            </div>
        </PageTransition>
    );
}
