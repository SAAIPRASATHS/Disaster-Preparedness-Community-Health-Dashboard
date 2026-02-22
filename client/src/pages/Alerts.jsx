import { useState } from 'react';
import { PageTransition, AnimatedCard } from '../components/Motion';
import { useToast } from '../components/Toast';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

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
    const { t } = useTranslation();
    const [tab, setTab] = useState('disaster');
    const [filter, setFilter] = useState('all');
    const toast = useToast();

    const alerts = tab === 'disaster' ? DISASTER_ALERTS : HEALTH_ALERTS;
    const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter);

    return (
        <PageTransition>
            <div className="max-w-5xl mx-auto pt-6">
                <div className="text-center mb-12">
                    <motion.h1
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-black text-slate-900 mb-2 tracking-tight"
                    >
                        <span className="bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent">{t('alerts.title1')}</span> {t('alerts.title2')}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-500 font-medium"
                    >
                        {t('alerts.subtitle')}
                    </motion.p>
                </div>

                {/* Tabs - Refined Glass Tabs */}
                <div className="flex justify-center mb-10">
                    <div className="bg-slate-100/50 p-1.5 rounded-2xl flex gap-1 backdrop-blur-sm border border-slate-200/50">
                        {[
                            { key: 'disaster', label: t('alerts.disasterAlerts') },
                            { key: 'health', label: t('alerts.healthAlerts') },
                        ].map((t) => (
                            <button
                                key={t.key}
                                onClick={() => { setTab(t.key); setFilter('all'); }}
                                className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${tab === t.key
                                    ? 'bg-white text-slate-900 shadow-md'
                                    : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filters - Minimalist Pills */}
                <div className="flex justify-center gap-3 mb-12">
                    {['all', 'HIGH', 'MEDIUM', 'LOW'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 ${filter === f
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                        >
                            {f === 'all' ? t('common.all') : f}
                        </button>
                    ))}
                </div>

                {/* Alert Cards - Redesigned List */}
                {filtered.length === 0 ? (
                    <div className="glass-card p-20 text-center">
                        <div className="text-5xl mb-6 opacity-20">🔕</div>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest leading-loose">{t('alerts.noAlerts')}</p>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto space-y-6">
                        {filtered.map((alert, i) => {
                            const s = SEVERITY[alert.severity];
                            const severityColor = alert.severity === 'HIGH' ? 'rose' : alert.severity === 'MEDIUM' ? 'amber' : 'emerald';

                            return (
                                <AnimatedCard
                                    key={i}
                                    delay={i * 0.06}
                                    className={`glass-card p-6 border-${severityColor}-500/10 group relative overflow-hidden`}
                                >
                                    <div className={`absolute left-0 top-0 w-1.5 h-full opacity-40 bg-${severityColor}-500`} />

                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-5">
                                            <div className={`w-12 h-12 rounded-2xl bg-${severityColor}-500/10 flex items-center justify-center text-xl`}>
                                                {s.icon}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">{alert.type}</h3>
                                                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${alert.severity === 'HIGH' ? 'bg-rose-50 text-rose-500' :
                                                        alert.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-600' :
                                                            'bg-emerald-50 text-emerald-600'
                                                        }`}>{alert.severity}</span>
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{alert.location} <span className="mx-2 opacity-30">|</span> {alert.time}</p>
                                                <p className="text-sm font-medium text-slate-600 mt-4 leading-relaxed line-clamp-2 md:line-clamp-none">
                                                    {alert.desc}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-blue-700">View Detailed Protocol</button>
                                        <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Share Update</button>
                                    </div>
                                </AnimatedCard>
                            );
                        })}
                    </div>
                )}
            </div>
        </PageTransition>
    );
}
