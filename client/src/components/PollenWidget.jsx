import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import API from '../api';

const PollenWidget = () => {
    const [pollen, setPollen] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPollen = async (lat, lon) => {
            try {
                const { data } = await API.get(`/pollen?lat=${lat}&lon=${lon}`);
                setPollen(data);
            } catch (err) {
                console.error('Pollen error:', err);
                setError('Failed to load pollen data');
            } finally {
                setLoading(false);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchPollen(pos.coords.latitude, pos.coords.longitude),
                () => { setError('Location permission denied'); setLoading(false); }
            );
        } else {
            setError('Geolocation not supported');
            setLoading(false);
        }
    }, []);

    if (loading) return (
        <div className="bg-white p-6 rounded-2xl shadow-card animate-pulse h-44 flex items-center justify-center text-gray-400">
            Loading pollen data...
        </div>
    );
    if (error) return <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-100">{error}</div>;
    if (!pollen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-gray-200 rounded-2xl shadow-card overflow-hidden"
        >
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-secondary uppercase tracking-widest">🌿 Pollen Index</p>
                            {pollen.isEstimated && (
                                <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">ESTIMATED</span>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{pollen.name}</p>
                    </div>
                    <div
                        className="px-3 py-1.5 rounded-full text-sm font-bold text-white transition-colors duration-500"
                        style={{ backgroundColor: pollen.overall.color }}
                    >
                        {pollen.overall.level}
                    </div>
                </div>

                {/* Pollen Types */}
                <div className="space-y-2 mb-4">
                    {pollen.types.map((t, i) => {
                        const barWidth = t.value !== null ? Math.min(100, (t.value / 100) * 100) : 0;
                        return (
                            <div key={i} className="flex items-center gap-3">
                                <span className="w-5 text-center text-sm">{t.emoji}</span>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-xs font-medium text-dark">{t.type}</span>
                                        <span className="text-[10px] font-semibold" style={{ color: t.color }}>
                                            {t.value !== null ? `${t.value} ${t.unit}` : 'N/A'} · {t.level}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${barWidth}%` }}
                                            transition={{ duration: 0.8, delay: i * 0.1 }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: t.color }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Advice */}
                <p className="text-xs text-secondary bg-gray-50 p-3 rounded-xl leading-relaxed">{pollen.advice}</p>
            </div>
        </motion.div>
    );
};

export default PollenWidget;
