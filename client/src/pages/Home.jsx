import { useState, useEffect, useCallback } from 'react';
import { fetchRisk, fetchChecklist } from '../api';
import RiskCard from '../components/RiskCard';
import ChecklistCard from '../components/ChecklistCard';
import WeatherWidget from '../components/WeatherWidget';
import AirQualityWidget from '../components/AirQualityWidget';
import PollenWidget from '../components/PollenWidget';
import { PageTransition, AnimatedCard, CardSkeleton } from '../components/Motion';
import { useToast } from '../components/Toast';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function Home() {
    const { t } = useTranslation();
    const [city, setCity] = useState('');
    const [riskData, setRiskData] = useState(null);
    const [checklist, setChecklist] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanLocation, setScanLocation] = useState(null);
    const [error, setError] = useState('');
    const toast = useToast();

    const [familyMembers, setFamilyMembers] = useState(4);
    const [elderly, setElderly] = useState(0);
    const [children, setChildren] = useState(0);
    const [conditions, setConditions] = useState([]);
    const conditionOptions = ['diabetes', 'asthma', 'heart_disease', 'hypertension'];

    const toggleCondition = (c) =>
        setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

    const handleSearch = useCallback(async (searchParams) => {
        const isCoordSearch = typeof searchParams === 'object' && searchParams.lat;
        const queryCity = typeof searchParams === 'string' ? searchParams : city;

        if (!isCoordSearch && !queryCity.trim()) return;

        setLoading(true);
        if (isCoordSearch) setIsScanning(true);
        setError('');
        setRiskData(null);
        setChecklist(null);

        try {
            const searchPayload = isCoordSearch ? searchParams : queryCity;
            const { data } = await fetchRisk(searchPayload);
            setRiskData(data);
            setScanLocation(searchPayload);
            if (data.isFallback) toast.warning(t('home.usingEstimated'));
            else toast.success(t('home.riskAssessedFor', { city: data.city }));

            const topRisk = data.risks.reduce((a, b) =>
                a.probabilityScore >= b.probabilityScore ? a : b
            );

            try {
                const { data: checklistData } = await fetchChecklist({
                    disasterType: topRisk.disasterType,
                    familyMembers,
                    elderly,
                    children,
                    conditions,
                });
                setChecklist(checklistData);
            } catch {
                // Checklist is optional
            }
        } catch (err) {
            const msg = err.response?.data?.error || t('home.failedFetch');
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
            setIsScanning(false);
        }
    }, [city, familyMembers, elderly, children, conditions, t, toast]);

    // Auto-Scanner Logic: Run once on mount to avoid multiple refreshes
    useEffect(() => {
        if (navigator.geolocation && !scanLocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    handleSearch({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                },
                (err) => {
                    console.warn('Auto-scan geolocation skipped:', err.message);
                }
            );
        }
    }, []); // Empty dependency array ensures this runs once

    return (
        <PageTransition>
            {/* Hero Section */}
            <div className="text-center mb-16 pt-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-6xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight leading-[1.1]">
                        {t('home.title1')} <br />
                        <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                            {t('home.title2')}
                        </span>
                    </h1>
                </motion.div>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="text-slate-500 max-w-2xl mx-auto text-lg md:text-xl font-medium leading-relaxed"
                >
                    {t('home.subtitle')}
                </motion.p>
            </div>

            {/* Quick Stats Grid */}
            <div className="max-w-4xl mx-auto mb-12 space-y-6">
                <WeatherWidget location={scanLocation} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AirQualityWidget location={scanLocation} />
                    <PollenWidget location={scanLocation} />
                </div>
            </div>

            {/* Main Search Action */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="max-w-2xl mx-auto mb-12"
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative group">
                    {isScanning && (
                        <div className="absolute inset-x-0 -top-10 text-center">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center justify-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[0.3em]"
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                {t('home.autoScanning')}
                            </motion.div>
                        </div>
                    )}
                    <div className="flex gap-4 p-2 glass-card rounded-[2.5rem] shadow-2xl transition-all duration-500 group-focus-within:ring-4 group-focus-within:ring-primary/5">
                        <input
                            id="city-input"
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder={t('home.placeholder')}
                            className="flex-1 bg-transparent border-none px-6 py-4 text-dark placeholder-slate-400 focus:outline-none text-lg font-medium"
                        />
                        <button
                            id="check-risk-btn"
                            type="submit"
                            disabled={loading}
                            className="premium-button text-white px-8 py-4 rounded-[2rem] flex items-center gap-3 active:scale-95 transition-transform"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                                    {t('home.checking')}
                                </>
                            ) : (
                                <>
                                    <span>{t('home.checkRisk')}</span>
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M13.172 12l-4.95-4.95 1.414-1.414L16 12l-6.364 6.364-1.414-1.414z" /></svg>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>

            {/* Family Profile - Refined Glassmorphism */}
            <AnimatedCard delay={0.4} className="max-w-2xl mx-auto mb-12 glass-card p-8 rounded-[2.5rem]">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                            {t('home.familyProfile')}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">{t('home.helpUsTailor') || 'Personalize your emergency readiness'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[
                        { label: t('home.familyMembers'), value: familyMembers, set: setFamilyMembers, min: 1 },
                        { label: t('home.elderly'), value: elderly, set: setElderly, min: 0 },
                        { label: t('home.children'), value: children, set: setChildren, min: 0 },
                    ].map((field) => (
                        <div key={field.label} className="relative group">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">{field.label}</label>
                            <input
                                type="number"
                                min={field.min}
                                value={field.value}
                                onChange={(e) => field.set(parseInt(e.target.value) || field.min)}
                                className="premium-input w-full text-base font-semibold group-hover:border-primary/30 transition-colors"
                            />
                        </div>
                    ))}
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 block">{t('home.conditions')}</label>
                    <div className="flex flex-wrap gap-3">
                        {conditionOptions.map((c) => {
                            const active = conditions.includes(c);
                            return (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => toggleCondition(c)}
                                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-300 transform active:scale-95 border-2 ${active
                                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105'
                                        : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300 hover:text-slate-700 shadow-sm'
                                        }`}
                                >
                                    {c.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </AnimatedCard>

            {/* Feedback & Results */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="max-w-2xl mx-auto mb-8 bg-risk-high/5 border border-risk-high/20 text-risk-high px-6 py-4 rounded-[1.5rem] flex items-center gap-3 font-medium"
                >
                    <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    {error}
                </motion.div>
            )}

            {loading && (
                <div className="max-w-4xl mx-auto grid gap-6">
                    <CardSkeleton className="h-64 rounded-[2.5rem]" />
                    <CardSkeleton className="h-64 rounded-[2.5rem]" />
                </div>
            )}

            {/* Results */}
            {riskData && !loading && (
                <div className="max-w-2xl mx-auto">
                    <div className="flex flex-wrap items-center gap-3 mb-5">
                        <h2 className="text-xl font-bold text-dark">
                            {riskData.city}, {riskData.country}
                        </h2>
                        <span className="text-xs text-secondary bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                            {riskData.currentWeather.temp}°C · {riskData.currentWeather.description}
                        </span>
                        {riskData.isFallback && (
                            <span className="text-xs text-warning bg-warning/10 px-3 py-1.5 rounded-full font-medium">
                                ⚠ {t('home.estimatedData')}
                            </span>
                        )}
                    </div>

                    {/* Risk Timeline */}
                    {riskData.riskTimeline && (
                        <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card mb-5">
                            <h3 className="text-sm font-semibold text-secondary mb-3 uppercase tracking-wider">{t('home.riskTimeline')}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-secondary mb-2 font-medium">{t('home.next24Hours')}</p>
                                    {riskData.riskTimeline.next24h.map((r, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm py-1">
                                            <span className="text-dark">{r.disasterType}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.projectedRisk === 'HIGH' ? 'bg-red-100 text-risk-high'
                                                : r.projectedRisk === 'MEDIUM' ? 'bg-amber-100 text-warning'
                                                    : 'bg-emerald-100 text-risk-low'
                                                }`}>
                                                {r.trend === 'increasing' ? '↑' : '→'} {r.projectedRisk}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <p className="text-xs text-secondary mb-2 font-medium">{t('home.next48Hours')}</p>
                                    {riskData.riskTimeline.next48h.map((r, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm py-1">
                                            <span className="text-dark">{r.disasterType}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.projectedRisk === 'HIGH' ? 'bg-red-100 text-risk-high'
                                                : r.projectedRisk === 'MEDIUM' ? 'bg-amber-100 text-warning'
                                                    : 'bg-emerald-100 text-risk-low'
                                                }`}>
                                                {r.trend === 'increasing' ? '↑' : r.trend === 'decreasing' ? '↓' : '→'} {r.projectedRisk}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </AnimatedCard>
                    )}

                    <div className="grid gap-4">
                        {riskData.risks.map((risk, i) => (
                            <AnimatedCard key={i} delay={i * 0.1}>
                                <RiskCard risk={risk} />
                            </AnimatedCard>
                        ))}
                    </div>

                    {checklist && <ChecklistCard checklist={checklist} />}
                </div>
            )}

            {/* Empty state */}
            {!riskData && !loading && !error && (
                <div className="text-center py-12 text-secondary">
                    <p className="text-5xl mb-4">🌍</p>
                    <p className="text-lg font-medium">{t('home.enterCity')}</p>
                    <p className="text-sm mt-1">{t('home.getRealTime')}</p>
                </div>
            )}
        </PageTransition>
    );
}
