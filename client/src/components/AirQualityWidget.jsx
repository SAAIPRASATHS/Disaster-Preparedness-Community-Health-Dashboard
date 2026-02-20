import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import API from '../api';
import { useTranslation } from 'react-i18next';

const AirQualityWidget = () => {
    const { t } = useTranslation();
    const [aq, setAq] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAQ = async (lat, lon) => {
            try {
                const { data } = await API.get(`/airquality?lat=${lat}&lon=${lon}`);
                setAq(data);
            } catch (err) {
                console.error('AQ error:', err);
                setError(t('airQuality.failedLoad'));
            } finally {
                setLoading(false);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchAQ(pos.coords.latitude, pos.coords.longitude),
                () => { setError(t('common.locationPermissionDenied')); setLoading(false); }
            );
        } else {
            setError(t('common.geolocationNotSupported'));
            setLoading(false);
        }
    }, [t]);

    if (loading) return (
        <div className="bg-white p-6 rounded-2xl shadow-card animate-pulse h-44 flex items-center justify-center text-gray-400">
            {t('airQuality.loadingAQ')}
        </div>
    );
    if (error) return <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-100">{error}</div>;
    if (!aq) return null;

    const pollutants = Object.values(aq.pollutants);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-gray-200 rounded-2xl shadow-card overflow-hidden"
        >
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-xs font-semibold text-secondary uppercase tracking-widest">{t('airQuality.title')}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{aq.name}</p>
                    </div>
                    <div className="text-right">
                        <div
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold text-white"
                            style={{ backgroundColor: aq.color }}
                        >
                            AQI {aq.aqi}
                        </div>
                        <p className="text-xs mt-1 font-medium" style={{ color: aq.color }}>{aq.level}</p>
                    </div>
                </div>

                {/* AQI Bar */}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, aq.aqi)}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: aq.color }}
                    />
                </div>

                {/* Health Advice */}
                <p className="text-xs text-secondary mb-4 bg-gray-50 p-3 rounded-xl leading-relaxed">{aq.advice}</p>

                {/* Pollutants Grid */}
                <div className="grid grid-cols-3 gap-2">
                    {pollutants.map((p, i) => (
                        <div key={i} className="bg-gray-50 rounded-xl p-2.5 text-center">
                            <p className="text-[10px] text-gray-400 font-semibold uppercase">{p.label}</p>
                            <p className="text-sm font-bold text-dark mt-0.5">
                                {p.value !== null ? p.value.toFixed(1) : 'N/A'}
                            </p>
                            <p className="text-[9px] text-gray-400">{p.unit}</p>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default AirQualityWidget;
