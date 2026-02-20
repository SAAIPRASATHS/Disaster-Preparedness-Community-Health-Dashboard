import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WeatherWidget = () => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchWeather = async (lat, lon) => {
            try {
                const response = await axios.get(`/api/weather?lat=${lat}&lon=${lon}`);
                setWeather(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Weather error:', err);
                setError('Failed to load weather');
                setLoading(false);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchWeather(position.coords.latitude, position.coords.longitude);
                },
                () => {
                    // Default to a fallback or just show error
                    setError('Location permission denied');
                    setLoading(false);
                }
            );
        } else {
            setError('Geolocation not supported');
            setLoading(false);
        }
    }, []);

    if (loading) return <div className="bg-white p-4 rounded-2xl shadow-sm animate-pulse h-32 flex items-center justify-center">Loading weather...</div>;
    if (error) return <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm">{error}</div>;
    if (!weather) return null;

    const { main, weather: w, name } = weather;
    const iconUrl = `https://openweathermap.org/img/wn/${w[0].icon}@2x.png`;

    return (
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden group">
            <div className="relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">{name}</p>
                        <h3 className="text-4xl font-bold mt-1">{Math.round(main.temp)}°C</h3>
                    </div>
                    <img src={iconUrl} alt={w[0].description} className="w-20 h-20 -mt-4 -mr-2 drop-shadow-lg" />
                </div>
                <div className="mt-2 text-blue-100 font-medium">
                    {w[0].main} — {w[0].description}
                </div>
                <div className="mt-4 flex space-x-4 text-xs text-blue-200">
                    <span>Humidity: {main.humidity}%</span>
                    <span>Feels like: {Math.round(main.feels_like)}°C</span>
                </div>
            </div>
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-colors" />
        </div>
    );
};

export default WeatherWidget;
