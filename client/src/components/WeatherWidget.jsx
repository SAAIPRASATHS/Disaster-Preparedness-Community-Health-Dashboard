import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import API from '../api';
import { useTranslation } from 'react-i18next';

const WeatherWidget = ({ location }) => {
    const { t, i18n } = useTranslation();
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchByCoord = async (lat, lon) => {
            try {
                setLoading(true);
                const { data } = await API.get(`/weather?lat=${lat}&lon=${lon}`);
                setWeather(data);
            } catch (err) {
                console.error('Weather error:', err);
                setError(t('weather.failedLoad'));
            } finally {
                setLoading(false);
            }
        };

        const fetchByCity = async (cityName) => {
            try {
                setLoading(true);
                const { data } = await API.get(`/weather?city=${encodeURIComponent(cityName)}`);
                setWeather(data);
            } catch (err) {
                console.error('Weather error:', err);
                setError(t('weather.failedLoad'));
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
    if (!weather) return null;

    const { current, forecast, name } = weather;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-blue-600/10 via-white/40 to-indigo-600/5"
        >
            <div className="p-8 relative">
                {/* Accent Glow */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="text-6xl">{current.icon}</div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <svg className="w-3.5 h-3.5 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{name}</span>
                            </div>
                            <h3 className="text-5xl font-black text-slate-900 tracking-tighter">
                                {Math.round(current.temp)}<span className="text-primary/40">°C</span>
                            </h3>
                            <p className="text-slate-500 font-bold text-sm mt-1">{current.description}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 w-full md:w-auto">
                        <WeatherStat label={t('weather.feelsLike')} value={`${Math.round(current.feelsLike)}°`} />
                        <WeatherStat label={t('weather.humidity')} value={`${current.humidity}%`} />
                        <WeatherStat label={t('weather.wind')} value={`${current.windSpeed} km/h`} />
                        <WeatherStat label={t('weather.rain') || 'Rain'} value={`${current.rain || 0}mm`} />
                    </div>
                </div>
            </div>

            {/* Forecast Section */}
            {forecast && forecast.length > 0 && (
                <div className="bg-white/40 backdrop-blur-md px-8 py-6 border-t border-white/60">
                    <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
                        {forecast.map((day, i) => (
                            <div key={i} className="flex flex-col items-center py-2 px-1 rounded-2xl hover:bg-white/50 transition-colors">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                    {new Date(day.date).toLocaleDateString(i18n.language || 'en', { weekday: 'short' })}
                                </span>
                                <span className="text-2xl mb-2">{day.icon}</span>
                                <div className="flex flex-col items-center leading-none">
                                    <span className="text-sm font-black text-slate-900">{Math.round(day.tempMax)}°</span>
                                    <span className="text-[10px] font-bold text-slate-400 mt-1">{Math.round(day.tempMin)}°</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

const WeatherStat = ({ label, value }) => (
    <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-lg font-black text-slate-900 leading-none">{value}</p>
    </div>
);

export default WeatherWidget;
