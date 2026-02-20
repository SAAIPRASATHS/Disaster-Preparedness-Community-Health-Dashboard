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
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-dark mb-1">
                    {t('userDashboard.welcome')} <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">{user?.name || 'Citizen'}</span>
                </h1>
                <p className="text-secondary text-sm">{t('userDashboard.personalizedHub')}</p>
            </div>

            {/* Seasonal Hazard Banner (TN DMP) */}
            <AnimatePresence>
                {showSeasonBanner && (
                    <motion.div
                        initial={{ opacity: 0, y: -15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`mb-4 border-2 rounded-2xl px-5 py-3 flex items-start gap-3 ${season.color}`}
                    >
                        <div className="flex-1">
                            <p className="text-sm font-bold">{season.label}</p>
                            <p className="text-xs opacity-80">{season.sub}</p>
                        </div>
                        <button onClick={() => setShowSeasonBanner(false)} className="text-sm opacity-60 hover:opacity-100 mt-0.5">✕</button>
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
                        className="mb-3 bg-amber-50 border-2 border-warning/20 rounded-2xl px-5 py-3 flex items-start gap-3 alert-banner"
                    >
                        <span className="text-xl mt-0.5">⚡</span>
                        <div>
                            <p className="text-sm font-semibold text-dark">{t('userDashboard.proactiveAdvisory')}</p>
                            <p className="text-xs text-secondary">{alert.message}</p>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { icon: '🌡️', label: t('userDashboard.reportSymptoms'), action: () => navigate('/report'), color: 'from-red-500 to-red-400' },
                    { icon: '🗺️', label: t('userDashboard.viewMap'), action: () => navigate('/map'), color: 'from-emerald-500 to-emerald-400' },
                    { icon: '📢', label: t('nav.alerts'), action: () => navigate('/alerts'), color: 'from-amber-500 to-orange-400' },
                    { icon: '🏠', label: t('userDashboard.riskCheck'), action: () => navigate('/home'), color: 'from-primary to-blue-400' },
                ].map((btn, i) => (
                    <AnimatedCard key={i} delay={i * 0.05}>
                        <button onClick={btn.action}
                            className={`w-full bg-gradient-to-br ${btn.color} text-white rounded-2xl p-5 text-left shadow-card hover:shadow-card-hover transition-all active:scale-[0.97]`}>
                            <span className="text-2xl block mb-2">{btn.icon}</span>
                            <span className="text-sm font-semibold">{btn.label}</span>
                        </button>
                    </AnimatedCard>
                ))}
            </div>

            {/* SOS + Emergency Section */}
            <AnimatedCard className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-card mb-6">
                <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-4">{t('userDashboard.emergencyResponse')}</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* SOS Button */}
                    <button
                        onClick={handleSOS}
                        disabled={sosLoading || sosSent}
                        className={`flex-1 py-5 rounded-3xl font-black text-2xl transition-all tracking-tight ${sosSent
                            ? 'bg-slate-800 text-white shadow-lg'
                            : 'bg-emergency text-white hover:brightness-110 shadow-lg shadow-emergency/30 active:scale-[0.95] sos-pulse'
                            } disabled:opacity-70`}
                    >
                        {sosLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin h-6 w-6 border-3 border-white border-t-transparent rounded-full" />
                                {t('userDashboard.sendingSOS')}
                            </span>
                        ) : sosSent ? (
                            t('userDashboard.sosSentHelp')
                        ) : (
                            <span className="flex items-center justify-center gap-3">
                                <span className="text-3xl">🚨</span>
                                {t('userDashboard.sosEmergency')}
                            </span>
                        )}
                    </button>

                    <div className="flex flex-col gap-3 min-w-[200px]">
                        {/* Safe Button */}
                        <button onClick={markSafe}
                            className={`py-4 px-6 rounded-2xl font-bold transition-all ${safeStatus === 'safe'
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                                : 'bg-emerald-50 text-emerald-600 border-2 border-emerald-100 hover:bg-emerald-100/50'}`}
                        >
                            {t('userDashboard.iAmSafe')}
                        </button>

                        {/* Emergency Call */}
                        <a href="tel:112"
                            className="py-4 px-6 rounded-2xl font-bold text-center bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-black transition-all"
                        >
                            {t('userDashboard.call112')}
                        </a>
                    </div>
                </div>

                {/* File Complaint */}
                <button
                    onClick={() => setShowComplaint(!showComplaint)}
                    className="mt-4 text-sm text-primary font-semibold hover:underline"
                >
                    {showComplaint ? t('common.cancel') : t('userDashboard.fileComplaint')}
                </button>

                <AnimatePresence>
                    {showComplaint && (
                        <motion.form
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            onSubmit={handleComplaint}
                            className="mt-4 space-y-3 overflow-hidden"
                        >
                            <input
                                type="text"
                                placeholder={t('userDashboard.complaintLocationPlaceholder')}
                                value={complaintLocation}
                                onChange={(e) => setComplaintLocation(e.target.value)}
                                required
                                className="w-full bg-surface border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <textarea
                                placeholder={t('userDashboard.complaintDescPlaceholder')}
                                value={complaintDesc}
                                onChange={(e) => setComplaintDesc(e.target.value)}
                                required
                                rows={3}
                                className="w-full bg-surface border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                            />
                            <button
                                type="submit"
                                disabled={complaintLoading}
                                className="bg-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition disabled:bg-gray-300"
                            >
                                {complaintLoading ? t('userDashboard.submittingComplaint') : t('userDashboard.submitComplaint')}
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>
            </AnimatedCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Risk */}
                <div>
                    <h3 className="text-lg font-bold text-dark mb-3">{t('userDashboard.currentRiskOverview')}</h3>
                    {loading ? <CardSkeleton /> : riskData ? (
                        <div className="space-y-3">
                            {riskData.risks.map((risk, i) => (
                                <AnimatedCard key={i} delay={i * 0.08}>
                                    <RiskCard risk={risk} />
                                </AnimatedCard>
                            ))}
                            {riskData.riskTimeline && (
                                <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card">
                                    <h4 className="text-sm font-semibold text-secondary mb-3">{t('userDashboard.riskTimeline')}</h4>
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-xs text-secondary mb-1 font-medium">{t('userDashboard.next24h')}</p>
                                            {riskData.riskTimeline.next24h.map((r, i) => (
                                                <div key={i} className="flex items-center justify-between text-sm py-0.5">
                                                    <span className="text-dark">{r.disasterType}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.projectedRisk === 'HIGH' ? 'bg-red-100 text-risk-high' : r.projectedRisk === 'MEDIUM' ? 'bg-amber-100 text-warning' : 'bg-emerald-100 text-risk-low'
                                                        }`}>{r.trend === 'increasing' ? '↑' : '→'} {r.projectedRisk}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </AnimatedCard>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl p-8 text-center text-secondary shadow-card">
                            <p className="text-3xl mb-2">📊</p>
                            <p className="text-sm">{t('userDashboard.unableToLoad')}</p>
                        </div>
                    )}
                </div>

                {/* Emergency Kit + Alerts */}
                <div>
                    <h3 className="text-lg font-bold text-dark mb-3">{t('userDashboard.emergencyKit')}</h3>
                    <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card">
                        <p className="text-xs text-secondary mb-3">{t('userDashboard.basedOnFamily')} <strong className="text-dark">{familySize}</strong></p>
                        <ul className="space-y-2">
                            {kit.map((item, i) => (
                                <li key={i}
                                    onClick={() => toggleKitItem(item)}
                                    className={`flex items-center gap-3 text-sm cursor-pointer rounded-xl px-2 py-1.5 transition-colors ${kitChecked[item] ? 'bg-emerald-50 text-emerald-800' : 'text-dark/85 hover:bg-gray-50'}`}>
                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${kitChecked[item] ? 'bg-emerald-500 text-white' : 'bg-primary/10 text-primary'}`}>
                                        {kitChecked[item] ? '✓' : i + 1}
                                    </span>
                                    <span className={kitChecked[item] ? 'line-through opacity-60' : ''}>{t(`kitItems.${item}`, item)}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-3 text-xs text-secondary">{checkedCount}/{kit.length} {t('checklist.items', { count: checkedCount })} checked</p>
                    </AnimatedCard>

                    <h3 className="text-lg font-bold text-dark mb-3 mt-6">{t('userDashboard.recentAlerts')}</h3>
                    <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card">
                        <div className="space-y-3">
                            {liveAlerts.length > 0 ? liveAlerts.slice(0, 4).map((alert, i) => (
                                <div key={alert._id || i} className={`flex items-start gap-3 p-3 rounded-xl ${alert.severity === 'CRITICAL' ? 'bg-red-50' : alert.severity === 'HIGH' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                                    <span>{alert.severity === 'CRITICAL' ? '🔴' : alert.severity === 'HIGH' ? '🟡' : 'ℹ'}</span>
                                    <div>
                                        <p className="text-sm font-medium text-dark">{alert.message?.slice(0, 100)}</p>
                                        <p className="text-xs text-secondary">{alert.area} · {alert.type}</p>
                                    </div>
                                </div>
                            )) : (
                                <>
                                    <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                                        <span className="text-warning">⚠</span>
                                        <div>
                                            <p className="text-sm font-medium text-dark">{t('userDashboard.heavyRainfall')}</p>
                                            <p className="text-xs text-secondary">{t('userDashboard.mumbaiRegion')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                                        <span className="text-primary">ℹ</span>
                                        <div>
                                            <p className="text-sm font-medium text-dark">{t('userDashboard.dengueAdvisory')}</p>
                                            <p className="text-xs text-secondary">{t('userDashboard.postMonsoon')}</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <Link to="/alerts" className="block text-center text-sm text-primary font-semibold mt-4 hover:underline">{t('userDashboard.viewAllAlerts')}</Link>
                    </AnimatedCard>
                    {/* Preparedness Score (TN DMP) */}
                    <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card mt-6">
                        <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">📊 Preparedness Score</h3>
                        <div className="flex items-center gap-4">
                            <div className="relative w-16 h-16 flex-shrink-0">
                                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                                    <circle cx="18" cy="18" r="15.9" fill="none"
                                        stroke={prepScore >= 70 ? '#10b981' : prepScore >= 40 ? '#f59e0b' : '#ef4444'}
                                        strokeWidth="3"
                                        strokeDasharray={`${prepScore} ${100 - prepScore}`}
                                        strokeLinecap="round" />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-dark">{prepScore}%</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-dark">{prepScore >= 70 ? '✅ Well Prepared' : prepScore >= 40 ? '⚠️ Partially Prepared' : '🔴 Needs Attention'}</p>
                                <p className="text-xs text-secondary mt-1">Check kit items, run SOS, and complete a mock drill to improve your score.</p>
                            </div>
                        </div>
                    </AnimatedCard>

                    {/* Mock Drill Scheduler (TN DMP) */}
                    <AnimatedCard className={`border-2 rounded-2xl p-5 shadow-card mt-4 ${drillDue ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-200'}`}>
                        <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-2">📅 Mock Drill Schedule</h3>
                        <p className="text-sm text-dark font-medium">
                            {daysSinceDrill === null ? '⚠️ You have never run a family emergency drill.' :
                                drillDue ? `⚠️ Last drill was ${daysSinceDrill} days ago — a new drill is due!` :
                                    `✅ Last drill: ${daysSinceDrill}d ago — next drill in ${30 - daysSinceDrill} days.`}
                        </p>
                        <p className="text-xs text-secondary mt-1 mb-3">TN DMP recommends practising evacuation routes with all family members monthly.</p>
                        <button
                            onClick={markDrillDone}
                            className="w-full py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:brightness-110 transition-all">
                            ✅ Mark Drill Complete Today
                        </button>
                    </AnimatedCard>
                </div>
            </div>
        </PageTransition>
    );
}
