import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import API from '../api';

const WeatherWidget = () => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchWeather = async (lat, lon) => {
            try {
                const { data } = await API.get(`/weather?lat=${lat}&lon=${lon}`);
                setWeather(data);
            } catch (err) {
                console.error('Weather error:', err);
                setError('Failed to load weather');
            } finally {
                setLoading(false);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
                () => { setError('Location permission denied'); setLoading(false); }
            );
        } else {
            setError('Geolocation not supported');
            setLoading(false);
        }
    }, []);

    if (loading) return (
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-6 rounded-2xl shadow-lg animate-pulse h-44 flex items-center justify-center text-white/60">
            Loading weather...
        </div>
    );
    if (error) return <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-100">{error}</div>;
    if (!weather) return null;

    const { current, forecast, name } = weather;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white rounded-2xl shadow-lg overflow-hidden"
        >
            {/* Current Weather */}
            <div className="p-6 relative">
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest">📍 {name}</p>
                        <h3 className="text-5xl font-extrabold mt-1">{Math.round(current.temp)}°C</h3>
                        <p className="text-blue-100 mt-1 text-sm font-medium">{current.icon} {current.description}</p>
                    </div>
                    <div className="text-right space-y-1 text-xs text-blue-200">
                        <p>Feels like <span className="text-white font-bold">{Math.round(current.feelsLike)}°C</span></p>
                        <p>Humidity <span className="text-white font-bold">{current.humidity}%</span></p>
                        <p>Wind <span className="text-white font-bold">{current.windSpeed} km/h</span></p>
                        {current.rain > 0 && <p>Rain <span className="text-white font-bold">{current.rain} mm</span></p>}
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl" />
            </div>

            {/* 7-Day Forecast */}
            {forecast && forecast.length > 0 && (
                <div className="bg-black/10 backdrop-blur-sm px-6 py-4 border-t border-white/10">
                    <p className="text-[10px] text-blue-200 font-semibold uppercase tracking-widest mb-3">7-Day Forecast</p>
                    <div className="grid grid-cols-7 gap-1 text-center">
                        {forecast.map((day, i) => (
                            <div key={i} className="group">
                                <p className="text-[10px] text-blue-300 font-medium">
                                    {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                                </p>
                                <p className="text-lg my-0.5">{day.icon}</p>
                                <p className="text-xs font-bold">{Math.round(day.tempMax)}°</p>
                                <p className="text-[10px] text-blue-300">{Math.round(day.tempMin)}°</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default WeatherWidget;
