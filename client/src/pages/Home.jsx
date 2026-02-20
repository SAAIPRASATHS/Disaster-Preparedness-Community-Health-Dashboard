import { useState } from 'react';
import { fetchRisk, fetchChecklist } from '../api';
import RiskCard from '../components/RiskCard';
import ChecklistCard from '../components/ChecklistCard';
import WeatherWidget from '../components/WeatherWidget';
import { PageTransition, AnimatedCard, CardSkeleton } from '../components/Motion';
import { useToast } from '../components/Toast';

export default function Home() {
    const [city, setCity] = useState('');
    const [riskData, setRiskData] = useState(null);
    const [checklist, setChecklist] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const toast = useToast();

    const [familyMembers, setFamilyMembers] = useState(4);
    const [elderly, setElderly] = useState(0);
    const [children, setChildren] = useState(0);
    const [conditions, setConditions] = useState([]);
    const conditionOptions = ['diabetes', 'asthma', 'heart_disease', 'hypertension'];

    const toggleCondition = (c) =>
        setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!city.trim()) return;
        setLoading(true);
        setError('');
        setRiskData(null);
        setChecklist(null);

        try {
            const { data } = await fetchRisk(city);
            setRiskData(data);
            if (data.isFallback) toast.warning('Using estimated data — weather API unavailable');
            else toast.success(`Risk assessed for ${data.city}`);

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
            const msg = err.response?.data?.error || 'Failed to fetch risk data. Please try again.';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageTransition>
            {/* Hero */}
            <div className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-extrabold text-dark mb-3">
                    Disaster Risk <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">Assessment</span>
                </h1>
                <p className="text-secondary max-w-xl mx-auto text-sm md:text-base">
                    Enter your city for real-time disaster risk analysis with personalized preparedness recommendations.
                </p>
            </div>

            <div className="max-w-2xl mx-auto mb-8">
                <WeatherWidget />
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
                <div className="flex gap-3">
                    <input
                        id="city-input"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Enter city name (e.g. Mumbai, Chennai, Delhi)"
                        className="flex-1 bg-white border border-gray-200 rounded-2xl px-5 py-3.5 text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition shadow-card"
                    />
                    <button
                        id="check-risk-btn"
                        type="submit"
                        disabled={loading}
                        className="bg-primary hover:bg-primary/90 disabled:bg-gray-300 text-white font-semibold px-7 py-3.5 rounded-2xl transition-all duration-200 shadow-card hover:shadow-card-hover active:scale-[0.97]"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                Checking…
                            </span>
                        ) : 'Check Risk'}
                    </button>
                </div>
            </form>

            {/* Family Profile */}
            <AnimatedCard className="max-w-2xl mx-auto mb-8 bg-white border border-gray-200 rounded-2xl p-6 shadow-card">
                <h3 className="text-sm font-semibold text-secondary mb-3 uppercase tracking-wider">
                    Family Profile
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                    {[
                        { label: 'Family Members', value: familyMembers, set: setFamilyMembers, min: 1 },
                        { label: 'Elderly (60+)', value: elderly, set: setElderly, min: 0 },
                        { label: 'Children (<12)', value: children, set: setChildren, min: 0 },
                    ].map((field) => (
                        <div key={field.label}>
                            <label className="text-xs text-secondary block mb-1.5">{field.label}</label>
                            <input
                                type="number"
                                min={field.min}
                                value={field.value}
                                onChange={(e) => field.set(parseInt(e.target.value) || field.min)}
                                className="w-full bg-surface border border-gray-200 rounded-xl px-3 py-2.5 text-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                    ))}
                </div>
                <div>
                    <label className="text-xs text-secondary block mb-2">Conditions</label>
                    <div className="flex flex-wrap gap-2">
                        {conditionOptions.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => toggleCondition(c)}
                                className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all font-medium ${conditions.includes(c)
                                    ? 'bg-primary/10 border-primary text-primary'
                                    : 'border-gray-200 text-secondary hover:border-gray-300'
                                    }`}
                            >
                                {c.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </AnimatedCard>

            {/* Error */}
            {error && (
                <div className="max-w-2xl mx-auto mb-6 bg-red-50 border-2 border-risk-high/20 text-risk-high px-5 py-3 rounded-2xl text-sm font-medium">
                    ❌ {error}
                </div>
            )}

            {/* Loading Skeleton */}
            {loading && (
                <div className="max-w-2xl mx-auto grid gap-4">
                    <CardSkeleton />
                    <CardSkeleton />
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
                                ⚠ Estimated data
                            </span>
                        )}
                    </div>

                    {/* Risk Timeline */}
                    {riskData.riskTimeline && (
                        <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card mb-5">
                            <h3 className="text-sm font-semibold text-secondary mb-3 uppercase tracking-wider">📈 Risk Timeline</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-secondary mb-2 font-medium">Next 24 Hours</p>
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
                                    <p className="text-xs text-secondary mb-2 font-medium">Next 48 Hours</p>
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
                    <p className="text-lg font-medium">Enter a city above to begin</p>
                    <p className="text-sm mt-1">Get real-time weather-based disaster risk assessment</p>
                </div>
            )}
        </PageTransition>
    );
}
