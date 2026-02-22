import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import API from '../api';
import { useTranslation } from 'react-i18next';

const PollenWidget = ({ location }) => {
    const { t } = useTranslation();
    const [pollen, setPollen] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchByCoord = async (lat, lon) => {
            try {
                setLoading(true);
                const { data } = await API.get(`/pollen?lat=${lat}&lon=${lon}`);
                setPollen(data);
            } catch (err) {
                console.error('Pollen error:', err);
                setError(t('pollen.failedLoad'));
            } finally {
                setLoading(false);
            }
        };

        const fetchByCity = async (cityName) => {
            try {
                setLoading(true);
                const { data } = await API.get(`/pollen?city=${encodeURIComponent(cityName)}`);
                setPollen(data);
            } catch (err) {
                console.error('Pollen error:', err);
                setError(t('pollen.failedLoad'));
            } finally {
                setLoading(false);
            }
        };

        if (location) {
            if (location.lat && location.lon) {
                fetchByCoord(location.lat, location.lon);
            } else if (typeof location === 'string' || location.city) {
                fetchByCity(location.city || location);
            }
        } else {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => fetchByCoord(pos.coords.latitude, pos.coords.longitude),
                    () => { setError(t('common.locationPermissionDenied')); setLoading(false); }
                );
            } else {
                setError(t('common.geolocationNotSupported'));
                setLoading(false);
            }
        }
    }, [location, t]);

    if (loading) return <div className="skeleton h-64 w-full" />;
    if (error) return (
        <div className="glass-card bg-rose-50/50 border-rose-100 text-rose-600 p-6 rounded-[2rem] text-sm flex items-center gap-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            {error}
        </div>
    );
    if (!pollen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-[2.5rem] p-8 overflow-hidden relative"
        >
            {/* Accent Glow */}
            <div
                className="absolute right-0 top-0 w-64 h-64 rounded-full blur-3xl opacity-10 -mr-20 -mt-20"
                style={{ backgroundColor: pollen.overall.color }}
            />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{pollen.name}</span>
                            {pollen.isEstimated && (
                                <span className="bg-amber-100 text-amber-700 text-[8px] px-2 py-0.5 rounded-full font-black tracking-[0.1em] uppercase">
                                    {t('pollen.estimated')}
                                </span>
                            )}
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{t('pollen.title')}</h3>
                    </div>
                    <div
                        className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-current/20 font-premium"
                        style={{ backgroundColor: pollen.overall.color }}
                    >
                        {pollen.overall.level}
                    </div>
                </div>

                {/* Pollen Types with Refined Bars */}
                <div className="space-y-6 mb-8">
                    {pollen.types.map((t, i) => {
                        const barWidth = t.value !== null ? Math.min(100, (t.value / 100) * 100) : 0;
                        return (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                                    {t.emoji}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-700">{t.type}</span>
                                        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: t.color }}>
                                            {t.level} <span className="text-slate-300 ml-1">· {t.value !== null ? `${t.value}${t.unit}` : 'N/A'}</span>
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${barWidth}%` }}
                                            transition={{ duration: 1, delay: i * 0.1, ease: 'circOut' }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: t.color }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Advice Cloud */}
                <div className="bg-white/40 border border-white/60 p-5 rounded-3xl">
                    <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
                        "{pollen.advice}"
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default PollenWidget;
