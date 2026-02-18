import { useState } from 'react';
import { PageTransition, AnimatedCard } from '../components/Motion';
import { useToast } from '../components/Toast';

const DISASTER_ALERTS = [
    { type: 'Flood Warning', severity: 'HIGH', location: 'Mumbai, Maharashtra', time: '2 hours ago', desc: 'Heavy rainfall expected. Water levels rising in Mithi river.' },
    { type: 'Cyclone Watch', severity: 'MEDIUM', location: 'Chennai, Tamil Nadu', time: '6 hours ago', desc: 'Low-pressure area forming in Bay of Bengal. Monitor updates.' },
    { type: 'Heatwave Advisory', severity: 'HIGH', location: 'Delhi NCR', time: '12 hours ago', desc: 'Temperatures expected to exceed 44°C for the next 48 hours.' },
    { type: 'Earthquake Report', severity: 'LOW', location: 'Shimla, Himachal Pradesh', time: '1 day ago', desc: 'Minor tremor of magnitude 3.2 recorded. No damage reported.' },
];

const HEALTH_ALERTS = [
    { type: 'Dengue Outbreak', severity: 'HIGH', location: 'Mumbai Western Suburbs', time: '3 hours ago', desc: 'Significant spike in dengue cases post-monsoon. 47 new cases in 48h.' },
    { type: 'Water Contamination', severity: 'MEDIUM', location: 'Thane, Maharashtra', time: '8 hours ago', desc: 'Boil water advisory issued for Kalwa region due to pipeline damage.' },
    { type: 'Respiratory Alert', severity: 'LOW', location: 'Delhi NCR', time: '1 day ago', desc: 'AQI above 300. Avoid outdoor activities. Use N95 masks.' },
];

const SEVERITY = {
    HIGH: { bg: 'bg-red-50', border: 'border-risk-high/20', badge: 'bg-risk-high text-white', icon: '🔴' },
    MEDIUM: { bg: 'bg-amber-50', border: 'border-warning/20', badge: 'bg-warning text-dark', icon: '🟡' },
    LOW: { bg: 'bg-emerald-50', border: 'border-risk-low/20', badge: 'bg-risk-low text-white', icon: '🟢' },
};

export default function Alerts() {
    const [tab, setTab] = useState('disaster');
    const [filter, setFilter] = useState('all');
    const toast = useToast();

    const alerts = tab === 'disaster' ? DISASTER_ALERTS : HEALTH_ALERTS;
    const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter);

    return (
        <PageTransition>
            <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold text-dark mb-2">
                    <span className="bg-gradient-to-r from-warning to-red-400 bg-clip-text text-transparent">Alerts</span> Center
                </h1>
                <p className="text-secondary text-sm">Stay informed about disasters and health alerts in your region</p>
            </div>

            {/* Tabs */}
            <div className="flex justify-center gap-2 mb-6">
                {[
                    { key: 'disaster', label: '🌊 Disaster Alerts' },
                    { key: 'health', label: '🏥 Health Alerts' },
                ].map((t) => (
                    <button key={t.key} onClick={() => { setTab(t.key); setFilter('all'); }}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t.key
                            ? 'bg-primary text-white shadow-card' : 'bg-white text-secondary border border-gray-200 hover:border-gray-300'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="flex justify-center gap-2 mb-6">
                {['all', 'HIGH', 'MEDIUM', 'LOW'].map((f) => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${filter === f
                            ? 'bg-dark text-white border-dark' : 'bg-white text-secondary border-gray-200 hover:border-gray-300'}`}>
                        {f === 'all' ? 'All' : f}
                    </button>
                ))}
            </div>

            {/* Alert Cards */}
            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center text-secondary shadow-card">
                    <p className="text-4xl mb-3">🔕</p>
                    <p className="font-medium">No alerts in this category</p>
                </div>
            ) : (
                <div className="max-w-3xl mx-auto space-y-4">
                    {filtered.map((alert, i) => {
                        const s = SEVERITY[alert.severity];
                        return (
                            <AnimatedCard key={i} delay={i * 0.06}
                                className={`${s.bg} border-2 ${s.border} rounded-2xl p-5 shadow-card`}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-start gap-3">
                                        <span className="text-lg">{s.icon}</span>
                                        <div>
                                            <h3 className="font-bold text-dark">{alert.type}</h3>
                                            <p className="text-xs text-secondary mt-0.5">{alert.location} · {alert.time}</p>
                                        </div>
                                    </div>
                                    <span className={`${s.badge} text-xs font-bold px-3 py-1 rounded-full`}>{alert.severity}</span>
                                </div>
                                <p className="text-sm text-dark/80 ml-8">{alert.desc}</p>
                            </AnimatedCard>
                        );
                    })}
                </div>
            )}
        </PageTransition>
    );
}
