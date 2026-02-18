import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { fetchRisk, submitSOS, submitComplaint, fetchLiveAlerts } from '../api';
import { PageTransition, AnimatedCard, CardSkeleton } from '../components/Motion';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import RiskCard from '../components/RiskCard';

const EMERGENCY_KIT = {
    1: ['Water (4L)', 'First-aid kit', 'Flashlight', 'Phone charger', 'Whistle', 'Medications'],
    2: ['Water (8L)', 'First-aid kit', 'Flashlight + batteries', '2 phone chargers', 'Whistle', 'Medications', 'Blankets x2'],
    3: ['Water (12L)', 'First-aid kit', 'Flashlight + batteries', 'Phone chargers', 'Whistle', 'Medications', 'Blankets x3', 'Non-perishable food (3 days)'],
    4: ['Water (16L)', 'First-aid kit (extended)', 'Flashlight + lantern', 'Phone chargers', 'Whistle', 'Medications', 'Blankets x4', 'Non-perishable food (3 days)', 'Portable radio'],
};
function getKit(size) { return EMERGENCY_KIT[Math.min(size, 4)] || EMERGENCY_KIT[4]; }

export default function UserDashboard() {
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

    const markSafe = () => { setSafeStatus('safe'); toast.success('Your status has been marked as SAFE ✓'); };

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
            toast.error('🆘 SOS Alert sent! Authorities have been notified.');
        } catch (err) {
            // Fallback if geolocation fails
            try {
                await submitSOS({
                    location: { lat: 19.076, lng: 72.8777, address: 'Location unavailable — Mumbai fallback' },
                    message: 'Emergency SOS (location unavailable)',
                });
                setSOSSent(true);
                setSafeStatus('help');
                toast.error('🆘 SOS sent! (Location could not be determined)');
            } catch {
                toast.error('Failed to send SOS. Please call emergency services directly.');
            }
        } finally {
            setSOSLoading(false);
        }
    }, [sosLoading, toast]);

    // Complaint handler
    const handleComplaint = async (e) => {
        e.preventDefault();
        if (!complaintDesc.trim() || !complaintLocation.trim()) return;
        setComplaintLoading(true);
        try {
            await submitComplaint({ location: complaintLocation, description: complaintDesc });
            toast.success('Complaint submitted successfully');
            setShowComplaint(false);
            setComplaintDesc('');
            setComplaintLocation('');
        } catch {
            toast.error('Failed to submit complaint');
        } finally {
            setComplaintLoading(false);
        }
    };

    const familySize = user?.familyMembers || 4;
    const kit = getKit(familySize);

    return (
        <PageTransition>
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-dark mb-1">
                    Welcome, <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">{user?.name || 'Citizen'}</span>
                </h1>
                <p className="text-secondary text-sm">Your personalized preparedness hub</p>
            </div>

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
                            <p className="text-sm font-semibold text-dark">Proactive Advisory</p>
                            <p className="text-xs text-secondary">{alert.message}</p>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { icon: '🌡️', label: 'Report Symptoms', action: () => navigate('/report'), color: 'from-red-500 to-red-400' },
                    { icon: '🗺️', label: 'View Map', action: () => navigate('/map'), color: 'from-emerald-500 to-emerald-400' },
                    { icon: '📢', label: 'Alerts', action: () => navigate('/alerts'), color: 'from-amber-500 to-orange-400' },
                    { icon: '🏠', label: 'Risk Check', action: () => navigate('/home'), color: 'from-primary to-blue-400' },
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
                <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-4">Emergency Response</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* SOS Button */}
                    <button
                        onClick={handleSOS}
                        disabled={sosLoading || sosSent}
                        className={`flex-1 py-5 rounded-2xl font-bold text-xl transition-all ${sosSent
                            ? 'bg-red-500 text-white shadow-lg'
                            : 'bg-red-500 text-white hover:bg-red-600 active:scale-[0.95] sos-pulse'
                            } disabled:opacity-70`}
                    >
                        {sosLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                                Sending SOS...
                            </span>
                        ) : sosSent ? (
                            '🆘 SOS Sent — Help is on the way'
                        ) : (
                            '🆘 SOS — Emergency Alert'
                        )}
                    </button>

                    <div className="flex flex-col gap-2">
                        {/* Safe Button */}
                        <button onClick={markSafe}
                            className={`py-3 px-6 rounded-2xl font-semibold transition-all ${safeStatus === 'safe'
                                ? 'bg-emerald-500 text-white shadow-lg'
                                : 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200 hover:bg-emerald-100'}`}
                        >
                            ✓ I Am Safe
                        </button>

                        {/* Emergency Call */}
                        <a href="tel:112"
                            className="py-3 px-6 rounded-2xl font-semibold text-center bg-gray-100 text-dark border-2 border-gray-200 hover:bg-gray-200 transition-all"
                        >
                            📞 Call 112
                        </a>
                    </div>
                </div>

                {/* File Complaint */}
                <button
                    onClick={() => setShowComplaint(!showComplaint)}
                    className="mt-4 text-sm text-primary font-semibold hover:underline"
                >
                    {showComplaint ? 'Cancel' : '📝 File a Complaint'}
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
                                placeholder="Location (e.g., Andheri West, Mumbai)"
                                value={complaintLocation}
                                onChange={(e) => setComplaintLocation(e.target.value)}
                                required
                                className="w-full bg-surface border border-gray-200 rounded-xl px-4 py-3 text-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <textarea
                                placeholder="Describe your complaint..."
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
                                {complaintLoading ? 'Submitting...' : 'Submit Complaint'}
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>
            </AnimatedCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Risk */}
                <div>
                    <h3 className="text-lg font-bold text-dark mb-3">Current Risk Overview</h3>
                    {loading ? <CardSkeleton /> : riskData ? (
                        <div className="space-y-3">
                            {riskData.risks.map((risk, i) => (
                                <AnimatedCard key={i} delay={i * 0.08}>
                                    <RiskCard risk={risk} />
                                </AnimatedCard>
                            ))}
                            {riskData.riskTimeline && (
                                <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card">
                                    <h4 className="text-sm font-semibold text-secondary mb-3">📈 Risk Timeline</h4>
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-xs text-secondary mb-1 font-medium">Next 24h</p>
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
                            <p className="text-sm">Unable to load risk data</p>
                        </div>
                    )}
                </div>

                {/* Emergency Kit + Alerts */}
                <div>
                    <h3 className="text-lg font-bold text-dark mb-3">🎒 Emergency Kit</h3>
                    <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card">
                        <p className="text-xs text-secondary mb-3">Based on family size of <strong className="text-dark">{familySize}</strong></p>
                        <ul className="space-y-2">
                            {kit.map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm text-dark/85">
                                    <span className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center text-xs text-primary font-bold">{i + 1}</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </AnimatedCard>

                    <h3 className="text-lg font-bold text-dark mb-3 mt-6">🔔 Recent Alerts</h3>
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
                                            <p className="text-sm font-medium text-dark">Heavy Rainfall Warning</p>
                                            <p className="text-xs text-secondary">Mumbai region · 2 hours ago</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                                        <span className="text-primary">ℹ</span>
                                        <div>
                                            <p className="text-sm font-medium text-dark">Dengue Advisory Active</p>
                                            <p className="text-xs text-secondary">Post-monsoon health alert · 5 hours ago</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <Link to="/alerts" className="block text-center text-sm text-primary font-semibold mt-4 hover:underline">View all alerts →</Link>
                    </AnimatedCard>
                </div>
            </div>
        </PageTransition>
    );
}
