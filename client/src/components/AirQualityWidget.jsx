import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import API from '../api';
import { useTranslation } from 'react-i18next';

const AirQualityWidget = ({ location }) => {
    const { t } = useTranslation();
    const [aq, setAq] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchByCoord = async (lat, lon) => {
            try {
                setLoading(true);
                const { data } = await API.get(`/airquality?lat=${lat}&lon=${lon}`);
                setAq(data);
            } catch (err) {
                console.error('AQ error:', err);
                setError(t('airQuality.failedLoad'));
            } finally {
                setLoading(false);
            }
        };

        const fetchByCity = async (cityName) => {
            try {
                setLoading(true);
                const { data } = await API.get(`/airquality?city=${encodeURIComponent(cityName)}`);
                setAq(data);
            } catch (err) {
                console.error('AQ error:', err);
                setError(t('airQuality.failedLoad'));
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
            <svg className="w-5 h-5 font-black" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            {error}
        </div>
    );
    if (!aq) return null;

    const pollutants = Object.values(aq.pollutants);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-[2.5rem] p-8 overflow-hidden relative"
        >
            {/* Accent background based on AQI level */}
            <div
                className="absolute right-0 top-0 w-64 h-64 rounded-full blur-3xl opacity-10 -mr-20 -mt-20"
                style={{ backgroundColor: aq.color }}
            />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{aq.name || 'Current Area'}</span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{t('airQuality.title')}</h3>
                    </div>
                    <div className="text-right">
                        <div
                            className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg"
                            style={{ backgroundColor: aq.color }}
                        >
                            AQI {aq.aqi}
                        </div>
                        <p className="text-xs font-black mt-2 uppercase tracking-wide" style={{ color: aq.color }}>{aq.level}</p>
                    </div>
                </div>

                {/* AQI Bar */}
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-8 shadow-inner">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, aq.aqi)}%` }}
                        transition={{ duration: 1.2, ease: 'circOut' }}
                        className="h-full rounded-full shadow-lg"
                        style={{ backgroundColor: aq.color }}
                    />
                </div>

                {/* Advice Cloud */}
                <div className="bg-white/40 border border-white/60 p-5 rounded-3xl mb-8">
                    <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
                        "{aq.advice}"
                    </p>
                </div>

                {/* Pollutants Clean Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {pollutants.map((p, i) => (
                        <div key={i} className="bg-white/30 border border-white/60 rounded-2xl p-4 flex flex-col items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{p.label}</span>
                            <span className="text-xl font-black text-slate-900 leading-none">
                                {p.value !== null ? p.value.toFixed(1) : 'N/A'}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{p.unit}</span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default AirQualityWidget;
