import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { fetchRisk, submitSOS, submitComplaint, fetchLiveAlerts } from '../api';
import { PageTransition, AnimatedCard, CardSkeleton } from '../components/Motion';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import RiskCard from '../components/RiskCard';
import { useTranslation } from 'react-i18next';

const EMERGENCY_KIT = {
    1: ['Water (4L)', 'First-aid kit', 'Flashlight', 'Phone charger', 'Whistle', 'Medications'],
    2: ['Water (8L)', 'First-aid kit', 'Flashlight + batteries', '2 phone chargers', 'Whistle', 'Medications', 'Blankets x2'],
    3: ['Water (12L)', 'First-aid kit', 'Flashlight + batteries', 'Phone chargers', 'Whistle', 'Medications', 'Blankets x3', 'Non-perishable food (3 days)'],
    4: ['Water (16L)', 'First-aid kit (extended)', 'Flashlight + lantern', 'Phone chargers', 'Whistle', 'Medications', 'Blankets x4', 'Non-perishable food (3 days)', 'Portable radio'],
};
function getKit(size) { return EMERGENCY_KIT[Math.min(size, 4)] || EMERGENCY_KIT[4]; }

export default function UserDashboard() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const { socket } = useSocket();
    const [riskData, setRiskData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [safeStatus, setSafeStatus] = useState(null);
    const [sosLoading, setSOSLoading] = useState(false);
    const [sosSent, setSOSSent] = useState(false);
    const [liveAlerts, setLiveAlerts] = useState([]);

    // Complaint form
    const [showComplaint, setShowComplaint] = useState(false);
    const [complaintDesc, setComplaintDesc] = useState('');
    const [complaintLocation, setComplaintLocation] = useState('');
    const [complaintLoading, setComplaintLoading] = useState(false);

    // ── TN DMP: Seasonal hazard banner ──
    const getSeason = () => {
        const m = new Date().getMonth() + 1;
        if (m >= 6 && m <= 9) return { label: '🌧️ Southwest Monsoon Active', sub: 'Flood risk elevated (June–September). Stay prepared.', color: 'bg-blue-50 border-blue-300 text-blue-800' };
        if (m >= 10 && m <= 12) return { label: '🌀 Cyclone Season Active', sub: 'Northeast Monsoon active (Oct–Dec). Monitor coastal alerts.', color: 'bg-violet-50 border-violet-300 text-violet-800' };
        if (m >= 3 && m <= 5) return { label: '🌡️ Pre-Monsoon Heat Season', sub: 'Heatwave risk (March–May). Stay hydrated, avoid midday sun.', color: 'bg-orange-50 border-orange-300 text-orange-800' };
        return { label: '☀️ Dry Season', sub: 'No active seasonal hazard. Maintain your emergency kit.', color: 'bg-emerald-50 border-emerald-300 text-emerald-800' };
    };
    const [showSeasonBanner, setShowSeasonBanner] = useState(true);
    const season = getSeason();

    // ── TN DMP: Mock Drill Scheduler ──
    const lastDrillKey = 'lastMockDrill';
    const [lastDrill, setLastDrill] = useState(() => localStorage.getItem(lastDrillKey));
    const daysSinceDrill = lastDrill ? Math.floor((Date.now() - new Date(lastDrill).getTime()) / 86400000) : null;
    const drillDue = daysSinceDrill === null || daysSinceDrill >= 30;
    const markDrillDone = () => {
        const now = new Date().toISOString();
        localStorage.setItem(lastDrillKey, now);
        setLastDrill(now);
    };

    useEffect(() => {
        async function load() {
            try {
                const [riskRes, alertRes] = await Promise.allSettled([fetchRisk('Mumbai'), fetchLiveAlerts()]);
                if (riskRes.status === 'fulfilled') setRiskData(riskRes.value.data);
                if (alertRes.status === 'fulfilled') setLiveAlerts(alertRes.value.data?.slice(0, 5) || []);
            } catch { /* silent */ }
            finally { setLoading(false); }
        }
        load();
    }, []);

    // Listen for proactive alerts
    useEffect(() => {
        if (!socket) return;
        const onProactive = (data) => {
            setLiveAlerts((prev) => [data, ...prev].slice(0, 8));
            toast.warning(`⚡ ${data.message.slice(0, 80)}`);
        };
        socket.on('proactive-alert', onProactive);
        socket.on('live-alert', onProactive);
        return () => {
            socket.off('proactive-alert', onProactive);
            socket.off('live-alert', onProactive);
        };
    }, [socket, toast]);

    const markSafe = () => { setSafeStatus('safe'); toast.success(t('userDashboard.safeMarked')); };

    // SOS handler
    const handleSOS = useCallback(async () => {
        if (sosLoading) return;
        setSOSLoading(true);
        try {
            const position = await new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocation not supported'));
                    return;
                }
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve(pos),
                    (err) => reject(err),
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            });

            const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                address: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
            };

            await submitSOS({ location, message: 'Emergency SOS' });
            setSOSSent(true);
            setSafeStatus('help');
            toast.error(t('userDashboard.sosAlertSent'));
        } catch (err) {
            // Fallback if geolocation fails
            try {
                await submitSOS({
                    location: { lat: 19.076, lng: 72.8777, address: 'Location unavailable — Mumbai fallback' },
                    message: 'Emergency SOS (location unavailable)',
                });
                setSOSSent(true);
                setSafeStatus('help');
                toast.error(t('userDashboard.sosNoLocation'));
            } catch {
                toast.error(t('userDashboard.sosFailed'));
            }
        } finally {
            setSOSLoading(false);
        }
    }, [sosLoading, toast, t]);

    // Complaint handler
    const handleComplaint = async (e) => {
        e.preventDefault();
        if (!complaintDesc.trim() || !complaintLocation.trim()) return;
        setComplaintLoading(true);
        try {
            await submitComplaint({ location: complaintLocation, description: complaintDesc });
            toast.success(t('userDashboard.complaintSubmitted'));
            setShowComplaint(false);
            setComplaintDesc('');
            setComplaintLocation('');
        } catch {
            toast.error(t('userDashboard.complaintFailed'));
        } finally {
            setComplaintLoading(false);
        }
    };

    const familySize = user?.familyMembers || 4;
    const kit = getKit(familySize);

    // ── Preparedness Score (TN DMP + DH_33) ──
    const [kitChecked, setKitChecked] = useState(() => {
        try { return JSON.parse(localStorage.getItem('kitChecked') || '{}'); } catch { return {}; }
    });
    const toggleKitItem = (item) => {
        setKitChecked(prev => {
            const updated = { ...prev, [item]: !prev[item] };
            localStorage.setItem('kitChecked', JSON.stringify(updated));
            return updated;
        });
    };
    const checkedCount = kit.filter(item => kitChecked[item]).length;
    const prepScore = Math.round(
        (checkedCount / kit.length) * 60 +       // 60% from kit
        (sosSent ? 20 : 0) +                        // 20% from SOS test
        (lastDrill ? 20 : 0)                        // 20% from mock drill
    );

    return (
        <PageTransition>
            <div className="mb-12 pt-4">
                <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-black text-slate-900 mb-2 tracking-tight"
                >
                    {t('userDashboard.welcome')} <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">{user?.name || 'Citizen'}</span>
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-slate-500 font-medium"
                >
                    {t('userDashboard.personalizedHub')}
                </motion.p>
            </div>

            {/* Seasonal Hazard Banner (TN DMP) - Refined glass banner */}
            <AnimatePresence>
                {showSeasonBanner && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`mb-8 p-6 rounded-[2rem] border-2 glass-morphism relative overflow-hidden flex items-center gap-5 shadow-lg ${season.color.replace('bg-', 'bg-opacity-5 ')} border-opacity-20`}
                        style={{ borderColor: season.color.includes('blue') ? '#3B82F644' : season.color.includes('violet') ? '#8B5CF644' : season.color.includes('orange') ? '#F59E0B44' : '#10B98144' }}
                    >
                        <div className="p-3 bg-white/50 rounded-2xl shadow-sm text-2xl">
                            {season.label.split(' ')[0]}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none mb-1">{season.label.substring(season.label.indexOf(' ') + 1)}</p>
                            <p className="text-xs font-bold text-slate-500 mt-1">{season.sub}</p>
                        </div>
                        <button onClick={() => setShowSeasonBanner(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-slate-400 transition-colors">✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Proactive Alert Banners */}
            <AnimatePresence>
                {liveAlerts.filter((a) => a.type === 'proactive').slice(0, 2).map((alert, i) => (
                    <motion.div
                        key={alert._id || i}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 glass-card border-amber-500/20 px-6 py-4 flex items-center gap-4 group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-xl animate-pulse">⚡</div>
                        <div>
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-0.5">{t('userDashboard.proactiveAdvisory')}</p>
                            <p className="text-sm font-bold text-slate-700">{alert.message}</p>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Quick Actions - Unified glass grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                {[
                    { icon: '🌡️', label: t('userDashboard.reportSymptoms'), action: () => navigate('/report'), color: '#EF4444' },
                    { icon: '🗺️', label: t('userDashboard.viewMap'), action: () => navigate('/map'), color: '#10B981' },
                    { icon: '📢', label: t('nav.alerts'), action: () => navigate('/alerts'), color: '#F59E0B' },
                    { icon: '🏠', label: t('userDashboard.riskCheck'), action: () => navigate('/home'), color: '#2563EB' },
                ].map((btn, i) => (
                    <AnimatedCard key={i} delay={i * 0.05}>
                        <button onClick={btn.action}
                            className="w-full glass-card p-8 text-left group relative overflow-hidden transition-all active:scale-95">
                            <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl -mr-12 -mt-12 transition-colors group-hover:bg-opacity-20" style={{ backgroundColor: `${btn.color}11` }} />
                            <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 w-fit group-hover:scale-110 transition-transform duration-500" style={{ boxShadow: `0 10px 15px -3px ${btn.color}22` }}>
                                <span className="text-2xl">{btn.icon}</span>
                            </div>
                            <span className="text-sm font-black text-slate-900 tracking-tight leading-tight block">{btn.label}</span>
                        </button>
                    </AnimatedCard>
                ))}
            </div>

            {/* SOS + Emergency Section - Premium Control Tray */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <AnimatedCard className="lg:col-span-2 glass-card p-10 border-rose-500/10 shadow-2xl shadow-rose-500/5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-transparent opacity-20" />

                    <div className="flex flex-col md:flex-row gap-10 items-center">
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-3">{t('userDashboard.emergencyResponse')}</h3>
                            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter">Instant Support</h2>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xs mx-auto md:mx-0">
                                Trigger immediate assistance or mark yourself as safe during an active crisis.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 w-full md:w-[320px]">
                            <button
                                onClick={handleSOS}
                                disabled={sosLoading || sosSent}
                                className={`w-full py-6 rounded-3xl font-black text-xl transition-all shadow-2xl relative overflow-hidden ${sosSent
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-rose-500/30 active:scale-95 sos-pulse'
                                    }`}
                            >
                                {sosLoading ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                                        <span>SIGNALLING...</span>
                                    </div>
                                ) : sosSent ? 'HELP IS COMING' : 'TRIGGER SOS'}
                            </button>

                            <div className="flex gap-4">
                                <button onClick={markSafe}
                                    className={`flex-1 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${safeStatus === 'safe'
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                                        : 'bg-white border-2 border-slate-100 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100'}`}
                                >
                                    {t('userDashboard.iAmSafe')}
                                </button>
                                <a href="tel:112"
                                    className="flex-1 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center bg-slate-900 text-white hover:bg-black transition-all"
                                >
                                    {t('userDashboard.call112')}
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                        <button
                            onClick={() => setShowComplaint(!showComplaint)}
                            className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-blue-700"
                        >
                            {showComplaint ? t('common.cancel') : t('userDashboard.fileComplaint')}
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Response Team Online</span>
                        </div>
                    </div>

                    <AnimatePresence>
                        {showComplaint && (
                            <motion.form
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                onSubmit={handleComplaint}
                                className="mt-6 space-y-4"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder={t('userDashboard.complaintLocationPlaceholder')}
                                        value={complaintLocation}
                                        onChange={(e) => setComplaintLocation(e.target.value)}
                                        required
                                        className="premium-input text-xs"
                                    />
                                    <button
                                        type="submit"
                                        disabled={complaintLoading}
                                        className="premium-button text-[10px] py-4"
                                    >
                                        {complaintLoading ? 'SUBMITTING...' : t('userDashboard.submitComplaint')}
                                    </button>
                                </div>
                                <textarea
                                    placeholder={t('userDashboard.complaintDescPlaceholder')}
                                    value={complaintDesc}
                                    onChange={(e) => setComplaintDesc(e.target.value)}
                                    required
                                    rows={2}
                                    className="premium-input text-xs resize-none"
                                />
                            </motion.form>
                        )}
                    </AnimatePresence>
                </AnimatedCard>

                {/* Preparedness Score - Refined UI */}
                <AnimatedCard className="glass-card p-10 flex flex-col justify-center items-center text-center group">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Readiness Score</h3>
                    <div className="relative w-32 h-32 mb-6 group-hover:scale-110 transition-transform duration-500">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                            <circle cx="18" cy="18" r="16" fill="none"
                                stroke={prepScore >= 70 ? '#10b981' : prepScore >= 40 ? '#f59e0b' : '#ef4444'}
                                strokeWidth="3"
                                strokeDasharray={`${prepScore} 100`}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-slate-900 tracking-tighter">{prepScore}%</span>
                        </div>
                    </div>
                    <p className="text-sm font-black text-slate-900 mb-2 uppercase tracking-wide">
                        {prepScore >= 70 ? 'Resilient' : prepScore >= 40 ? 'Vulnerable' : 'At Risk'}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-widest">
                        Refine your kit to increase resilience
                    </p>
                </AnimatedCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:items-start">
                {/* Current Risk - Redesigned List */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('userDashboard.currentRiskOverview')}</h3>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Updates</span>
                    </div>
                    {loading ? <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div> : riskData ? (
                        <div className="space-y-6">
                            {riskData.risks.map((risk, i) => (
                                <AnimatedCard key={i} delay={i * 0.08}>
                                    <RiskCard risk={risk} />
                                </AnimatedCard>
                            ))}
                            {riskData.riskTimeline && (
                                <AnimatedCard className="glass-card p-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('userDashboard.riskTimeline')}</h4>
                                    </div>
                                    <div className="space-y-5">
                                        {riskData.riskTimeline.next24h.map((r, i) => (
                                            <div key={i} className="flex items-center justify-between group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-xs group-hover:bg-primary/10 transition-colors">
                                                        {i + 1}
                                                    </div>
                                                    <span className="text-sm font-black text-slate-700 tracking-tight">{r.disasterType}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase">{r.trend === 'increasing' ? 'Tide Up ✓' : 'Stable'}</span>
                                                    <span className={`text-[10px] px-3 py-1 rounded-full font-black tracking-widest uppercase ${r.projectedRisk === 'HIGH' ? 'bg-rose-50 text-rose-500' :
                                                        r.projectedRisk === 'MEDIUM' ? 'bg-amber-50 text-amber-600' :
                                                            'bg-emerald-50 text-emerald-600'
                                                        }`}>
                                                        {r.projectedRisk}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </AnimatedCard>
                            )}
                        </div>
                    ) : (
                        <div className="glass-card p-12 text-center">
                            <div className="text-4xl mb-4 opacity-20">📊</div>
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{t('userDashboard.unableToLoad')}</p>
                        </div>
                    )}
                </div>

                {/* Kit & Alerts Tray */}
                <div className="space-y-10">
                    <div className="glass-card overflow-hidden">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('userDashboard.emergencyKit')}</h3>
                                <div className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg">Level {familySize}</div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Calculated for your household</p>
                        </div>
                        <div className="p-8">
                            <ul className="space-y-3">
                                {kit.map((item, i) => (
                                    <li key={i}
                                        onClick={() => toggleKitItem(item)}
                                        className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${kitChecked[item] ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${kitChecked[item] ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                                                {i + 1}
                                            </span>
                                            <span className={`text-sm font-black tracking-tight ${kitChecked[item] ? '' : 'text-slate-600'}`}>{t(`kitItems.${item}`, item)}</span>
                                        </div>
                                        {kitChecked[item] && <span className="text-lg font-black tracking-tight leading-none bg-white/20 px-2.5 py-1 rounded-lg">✓</span>}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{checkedCount}/{kit.length} COMPLETED</span>
                                <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${(checkedCount / kit.length) * 100}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mock Drill - Premium Alert Style */}
                    <div className={`glass-card p-10 border-2 overflow-hidden relative group ${drillDue ? 'border-amber-500/20 shadow-amber-500/5' : 'border-emerald-500/20 shadow-emerald-500/5'}`}>
                        <div className={`absolute top-0 right-0 w-4 h-full opacity-20 ${drillDue ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">DRILL PROTOCOL</h3>
                        <p className="text-lg font-black text-slate-900 leading-snug tracking-tight mb-4">
                            {daysSinceDrill === null ? 'Protocol hasn\'t been tested yet.' :
                                drillDue ? `Protocol expires in ${daysSinceDrill} days. Refresh now.` :
                                    `Next protocol check in ${30 - daysSinceDrill} days.`}
                        </p>
                        <p className="text-xs text-slate-500 font-medium mb-8 leading-relaxed">
                            Practising evacuation routes is critical for family safety.
                        </p>
                        <button
                            onClick={markDrillDone}
                            className={`premium-button w-full shadow-none ${drillDue ? 'bg-amber-500 shadow-amber-500/20' : 'bg-emerald-500 shadow-emerald-500/20'}`}>
                            {drillDue ? 'RUN DRILL NOW' : 'REFRESH PROTOCOL'}
                        </button>
                    </div>

                    {/* Recent Alerts List */}
                    <div className="glass-card p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">{t('userDashboard.recentAlerts')}</h3>
                            <Link to="/alerts" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">{t('userDashboard.viewAllAlerts')}</Link>
                        </div>
                        <div className="space-y-4">
                            {(liveAlerts.length > 0 ? liveAlerts.slice(0, 3) : []).map((alert, i) => (
                                <div key={alert._id || i} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${alert.severity === 'CRITICAL' ? 'text-rose-500' : 'text-amber-600'
                                            }`}>{alert.severity}</span>
                                        <span className="text-[9px] font-black text-slate-300 uppercase">{alert.type}</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-700 leading-relaxed mb-3">{alert.message?.slice(0, 80)}...</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{alert.area}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
