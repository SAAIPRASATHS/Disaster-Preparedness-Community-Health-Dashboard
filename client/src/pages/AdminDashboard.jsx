import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchClusters, fetchRisk, fetchSOSAlerts, fetchComplaints, fetchLiveAlerts, fetchResources, updateResourceStatus, resolveSOSAlert, resolveComplaint, fetchReports } from '../api';
import { useSocket } from '../context/SocketContext';
import { PageTransition, AnimatedCard, CardSkeleton } from '../components/Motion';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const CONFIDENCE_STYLES = {
    high: { bg: 'bg-red-50', border: 'border-risk-high/20', text: 'text-risk-high', badge: 'bg-risk-high text-white' },
    medium: { bg: 'bg-amber-50', border: 'border-warning/20', text: 'text-warning', badge: 'bg-warning text-dark' },
    low: { bg: 'bg-emerald-50', border: 'border-risk-low/20', text: 'text-risk-low', badge: 'bg-risk-low text-white' },
};

const RESOURCE_ICONS = {
    fire_station: '🚒',
    police_station: '👮',
    hotel: '🏨',
    food_point: '🍱'
};

function getLevel(c) { return c >= 0.7 ? 'high' : c >= 0.4 ? 'medium' : 'low'; }

export default function AdminDashboard() {
    const { t } = useTranslation();
    const [clusters, setClusters] = useState(null);
    const [riskData, setRiskData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();
    const toast = useToast();

    // Real-time feeds
    const [sosAlerts, setSosAlerts] = useState([]);
    const [complaints, setComplaints] = useState([]);
    const [liveAlerts, setLiveAlerts] = useState([]);
    const [resources, setResources] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [criticalAreas, setCriticalAreas] = useState([]);
    const [symptomReports, setSymptomReports] = useState([]);

    const addNotification = useCallback((notif) => {
        const entry = { ...notif, id: Date.now() + Math.random(), time: new Date() };
        setNotifications((prev) => [entry, ...prev].slice(0, 30));
    }, []);

    // Load initial data
    useEffect(() => {
        async function load() {
            try {
                const [clusterRes, riskRes, sosRes, compRes, alertRes, resourceRes, reportRes] = await Promise.allSettled([
                    fetchClusters(),
                    fetchRisk('Mumbai'),
                    fetchSOSAlerts(),
                    fetchComplaints(),
                    fetchLiveAlerts(),
                    fetchResources(),
                    fetchReports()
                ]);
                if (clusterRes.status === 'fulfilled') setClusters(clusterRes.value.data);
                if (riskRes.status === 'fulfilled') setRiskData(riskRes.value.data);
                if (sosRes.status === 'fulfilled') setSosAlerts(sosRes.value.data || []);
                if (compRes.status === 'fulfilled') setComplaints(compRes.value.data || []);
                if (alertRes.status === 'fulfilled') setLiveAlerts(alertRes.value.data || []);
                if (resourceRes.status === 'fulfilled') setResources(resourceRes.value.data || []);
                if (reportRes.status === 'fulfilled') setSymptomReports(reportRes.value.data || []);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        }
        load();
    }, []);

    // WebSocket listeners
    useEffect(() => {
        if (!socket) return;

        const onNewSOS = (data) => {
            setSosAlerts((prev) => [data, ...prev]);
            addNotification({ type: 'sos', message: `SOS from ${data.userName}`, severity: 'CRITICAL' });
            toast.error(`🆘 SOS Alert from ${data.userName}`);
        };

        const onNewComplaint = (data) => {
            setComplaints((prev) => [data, ...prev]);
            addNotification({ type: 'complaint', message: `Complaint: ${data.description?.slice(0, 60)}`, severity: 'MEDIUM' });
        };

        const onLiveAlert = (data) => {
            setLiveAlerts((prev) => [data, ...prev]);
            addNotification({ type: data.type, message: data.message, severity: data.severity });
        };

        const onProactiveAlert = (data) => {
            addNotification({ type: 'proactive', message: data.message, severity: data.severity });
            toast.warning(`⚡ Proactive: ${data.message.slice(0, 80)}`);
        };

        const onAreaCritical = (data) => {
            setCriticalAreas((prev) => {
                const exists = prev.find((a) => a.area === data.area);
                if (exists) return prev.map((a) => a.area === data.area ? data : a);
                return [...prev, data];
            });
            addNotification({ type: 'critical', message: data.message, severity: 'CRITICAL' });
            toast.error(`🚨 CRITICAL: ${data.area}`);
        };

        const onGeofenceAlert = (data) => {
            addNotification({ type: 'geofence', message: `Geofence breach: citizen entered ${data.zone} zone`, severity: 'HIGH' });
        };

        const onSOSResolved = (data) => {
            setSosAlerts((prev) => prev.map((a) => (a._id || a.id) === data.id ? { ...a, resolved: true } : a));
        };

        const onComplaintResolved = (data) => {
            setComplaints((prev) => prev.map((c) => (c._id || c.id) === (data.id || data.complaint?._id) ? { ...c, status: 'resolved' } : c));
        };

        const onNewReport = (data) => {
            setSymptomReports((prev) => [data, ...prev]);
            addNotification({ type: 'report', message: `New report from ${data.location}`, severity: 'LOW' });
        };

        const onResourceUpdate = (data) => {
            setResources((prev) => prev.map((r) => r._id === data._id ? data : r));
        };

        socket.on('new-sos', onNewSOS);
        socket.on('new-complaint', onNewComplaint);
        socket.on('new-report', onNewReport);
        socket.on('live-alert', onLiveAlert);
        socket.on('proactive-alert', onProactiveAlert);
        socket.on('area-critical', onAreaCritical);
        socket.on('geofence-alert', onGeofenceAlert);
        socket.on('sos-resolved', onSOSResolved);
        socket.on('complaint-resolved', onComplaintResolved);
        socket.on('resource-update', onResourceUpdate);

        return () => {
            socket.off('new-sos', onNewSOS);
            socket.off('new-complaint', onNewComplaint);
            socket.off('new-report', onNewReport);
            socket.off('live-alert', onLiveAlert);
            socket.off('proactive-alert', onProactiveAlert);
            socket.off('area-critical', onAreaCritical);
            socket.off('geofence-alert', onGeofenceAlert);
            socket.off('sos-resolved', onSOSResolved);
            socket.off('complaint-resolved', onComplaintResolved);
            socket.off('resource-update', onResourceUpdate);
        };
    }, [socket, addNotification, toast]);

    const handleResolveSOS = async (id) => {
        try {
            await resolveSOSAlert(id);
            setSosAlerts((prev) => prev.map((a) => (a._id || a.id) === id ? { ...a, resolved: true } : a));
            toast.success(t('adminDashboard.sosResolved'));
        } catch {
            toast.error(t('adminDashboard.sosResolveFailed'));
        }
    };

    const handleResolveComplaint = async (id) => {
        try {
            await resolveComplaint(id);
            setComplaints((prev) => prev.map((c) => (c._id || c.id) === id ? { ...c, status: 'resolved' } : c));
            toast.success(t('adminDashboard.complaintResolved'));
        } catch {
            toast.error(t('adminDashboard.complaintResolveFailed'));
        }
    };

    const handleToggleFood = async (id, foodAvailable) => {
        try {
            const { data } = await updateResourceStatus(id, { foodAvailable });
            setResources(prev => prev.map(r => r._id === id ? data : r));
            toast.success(t('adminDashboard.foodStatusUpdated', { name: data.name }));
        } catch {
            toast.error('Failed to update food status');
        }
    };

    const barData = clusters?.clusters?.length ? {
        labels: clusters.clusters.map((c) => c.area),
        datasets: [{
            label: 'Reports',
            data: clusters.clusters.map((c) => c.totalReports),
            backgroundColor: 'rgba(92,122,234,0.6)',
            borderColor: '#5C7AEA',
            borderWidth: 1,
            borderRadius: 8,
        }],
    } : null;

    const doughnutData = clusters?.clusters?.length ? {
        labels: clusters.clusters.map((c) => c.predictedDiseaseType),
        datasets: [{
            data: clusters.clusters.map((c) => c.confidence * 100),
            backgroundColor: ['#E85D75', '#F0A500', '#5C7AEA', '#4CAF82', '#8E9AAF', '#A7C7E7'],
            borderWidth: 0,
        }],
    } : null;

    const chartOpts = {
        responsive: true,
        plugins: { legend: { labels: { color: '#2E2E2E', font: { family: 'Inter' } } } },
        scales: { x: { ticks: { color: '#8E9AAF' }, grid: { color: '#eef0f6' } }, y: { ticks: { color: '#8E9AAF' }, grid: { color: '#eef0f6' } } },
    };

    const activeSOS = sosAlerts.filter((a) => !a.resolved).length;
    const pendingComplaints = complaints.filter((c) => c.status === 'pending').length;
    const resolvedComplaints = complaints.filter((c) => c.status === 'resolved').length;

    if (loading) {
        return (
            <PageTransition>
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-dark">{t('adminDashboard.title1')} {t('adminDashboard.title2')}</h1>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <CardSkeleton /><CardSkeleton /><CardSkeleton />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CardSkeleton /><CardSkeleton />
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold text-dark mb-2">
                    {t('adminDashboard.title1')} <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">{t('adminDashboard.title2')}</span>
                </h1>
                <p className="text-secondary text-sm">{t('adminDashboard.subtitle')}</p>
            </div>

            {/* Critical Area Escalation Banner */}
            <AnimatePresence>
                {criticalAreas.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-6"
                    >
                        {criticalAreas.map((area, i) => (
                            <div key={i} className="bg-red-100 border-2 border-risk-high/30 rounded-2xl px-5 py-3 mb-2 flex items-center gap-3 alert-banner">
                                <span className="text-2xl animate-pulse">🚨</span>
                                <div>
                                    <p className="text-sm font-bold text-risk-high">{t('adminDashboard.criticalEscalation')} — {area.area}</p>
                                    <p className="text-xs text-risk-high/80">{area.message}</p>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {[
                    { value: clusters?.clustersDetected || 0, label: t('adminDashboard.activeAlerts'), color: 'text-risk-high', icon: '🚨' },
                    { value: activeSOS, label: t('adminDashboard.activeSOS'), color: 'text-danger', icon: '🆘' },
                    { value: pendingComplaints, label: t('adminDashboard.pendingComplaints'), color: 'text-warning', icon: '📝' },
                    { value: riskData?.risks?.[0]?.riskLevel || 'N/A', label: t('adminDashboard.weatherRisk'), color: 'text-primary', icon: '🌦️' },
                    { value: clusters?.totalGlobalReports || 0, label: t('adminDashboard.totalReports'), color: 'text-risk-low', icon: '📊' },
                ].map((stat, i) => (
                    <AnimatedCard key={i} delay={i * 0.05} className="bg-white border border-gray-200 rounded-2xl p-5 text-center shadow-card">
                        <span className="text-2xl">{stat.icon}</span>
                        <p className={`text-3xl font-extrabold ${stat.color} mt-2`}>{stat.value}</p>
                        <p className="text-xs text-secondary mt-1 font-medium">{stat.label}</p>
                    </AnimatedCard>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Notification Panel */}
                <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card max-h-80 overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">{t('adminDashboard.liveNotifications')}</h3>
                        {notifications.length > 0 && (
                            <span className="notification-badge">{notifications.length}</span>
                        )}
                    </div>
                    <div className="space-y-2 overflow-y-auto max-h-56 pr-1">
                        <AnimatePresence>
                            {notifications.length === 0 ? (
                                <p className="text-sm text-secondary text-center py-4">{t('adminDashboard.noNotifications')}</p>
                            ) : notifications.slice(0, 15).map((n) => (
                                <motion.div
                                    key={n.id}
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`text-xs p-2.5 rounded-xl border ${n.severity === 'CRITICAL' ? 'bg-red-50 border-risk-high/20'
                                        : n.severity === 'HIGH' ? 'bg-amber-50 border-warning/20'
                                            : 'bg-blue-50 border-primary/15'}`}
                                >
                                    <span className="font-semibold">{n.type?.toUpperCase()}:</span> {n.message}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </AnimatedCard>

                {/* Live SOS Alerts */}
                <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card max-h-80 overflow-hidden">
                    <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">{t('adminDashboard.sosAlerts')}</h3>
                    <div className="space-y-2 overflow-y-auto max-h-56 pr-1">
                        {sosAlerts.length === 0 ? (
                            <p className="text-sm text-secondary text-center py-4">{t('adminDashboard.noSOS')}</p>
                        ) : sosAlerts.slice(0, 10).map((sos, i) => (
                            <div key={sos._id || i} className={`text-sm p-3 rounded-xl border-2 flex items-center justify-between ${sos.resolved ? 'bg-emerald-50 border-risk-low/20' : 'bg-red-50 border-risk-high/20'}`}>
                                <div>
                                    <p className="font-semibold text-dark">{sos.userName || 'Unknown'}</p>
                                    <p className="text-xs text-secondary">{sos.message || 'SOS'} · {sos.location?.address || `${sos.location?.lat?.toFixed(3)}, ${sos.location?.lng?.toFixed(3)}`}</p>
                                </div>
                                {!sos.resolved ? (
                                    <button
                                        onClick={() => handleResolveSOS(sos._id || sos.id)}
                                        className="text-xs bg-risk-high text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition font-semibold"
                                    >
                                        {t('common.resolve')}
                                    </button>
                                ) : (
                                    <span className="text-xs text-risk-low font-semibold">✓ {t('common.resolved')}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </AnimatedCard>
            </div>

            {/* Resource Management */}
            <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">{t('adminDashboard.resourceManagement')}</h3>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                            {t('adminDashboard.totalNearbyResources', { count: resources.length })}
                        </span>
                    </div>
                </div>
                <div className="space-y-2 overflow-y-auto max-h-72 pr-1">
                    {resources.length === 0 ? (
                        <p className="text-sm text-secondary text-center py-4">{t('adminDashboard.noResources')}</p>
                    ) : resources.map((res) => (
                        <div key={res._id} className="text-sm p-4 rounded-xl border-2 bg-white border-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{RESOURCE_ICONS[res.type] || '📍'}</span>
                                    <div>
                                        <p className="font-bold text-dark">{res.name}</p>
                                        <p className="text-xs text-secondary">{res.address}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {res.type === 'food_point' && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium">{t('common.foodAvailable')}:</span>
                                            <button
                                                onClick={() => handleToggleFood(res._id, !res.status.foodAvailable)}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${res.status.foodAvailable
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'bg-red-500 text-white'}`}
                                            >
                                                {res.status.foodAvailable ? `YES ✅` : `NO ❌`}
                                            </button>
                                        </div>
                                    )}
                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold uppercase">
                                        {res.type.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </AnimatedCard>

            {/* Live Complaints */}
            <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">{t('adminDashboard.complaints')}</h3>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                            {pendingComplaints} {t('common.pending')}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            {resolvedComplaints} {t('common.resolved')}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                            {complaints.length} {t('common.total')}
                        </span>
                    </div>
                </div>
                <div className="space-y-2 overflow-y-auto max-h-72 pr-1">
                    {complaints.length === 0 ? (
                        <p className="text-sm text-secondary text-center py-4">{t('adminDashboard.noComplaints')}</p>
                    ) : complaints.slice(0, 15).map((c, i) => (
                        <div key={c._id || i} className={`text-sm p-4 rounded-xl border-2 ${c.status === 'resolved' ? 'bg-emerald-50 border-risk-low/20' : 'bg-white border-warning/20'}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-dark">{c.description?.slice(0, 120)}</p>
                                    <p className="text-xs text-secondary mt-1">
                                        📍 {c.location} · 👤 {c.userName || 'Citizen'} · 🕐 {c.createdAt ? new Date(c.createdAt).toLocaleString() : 'N/A'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.status === 'resolved'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {c.status === 'resolved' ? `✓ ${t('common.resolved')}` : `⏳ ${t('common.pending')}`}
                                    </span>
                                    {c.status === 'pending' && (
                                        <button
                                            onClick={() => handleResolveComplaint(c._id || c.id)}
                                            className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition font-semibold"
                                        >
                                            {t('adminDashboard.markResolved')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </AnimatedCard>

            {/* Live Symptom Reports */}
            <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">{t('adminDashboard.symptomReports')}</h3>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                        {symptomReports.length} {t('common.total')}
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-72 pr-1">
                    {symptomReports.length === 0 ? (
                        <p className="col-span-full text-sm text-secondary text-center py-4">{t('adminDashboard.noReports')}</p>
                    ) : symptomReports.slice(0, 30).map((r, i) => (
                        <div key={r._id || i} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                            <div className="flex justify-between items-start mb-2">
                                <p className="font-bold text-dark capitalize">{r.location}</p>
                                <span className="text-[10px] text-secondary">{r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : ''}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {r.symptoms.map(s => (
                                    <span key={s} className="bg-white px-1.5 py-0.5 rounded text-[10px] text-secondary border border-gray-100">{s}</span>
                                ))}
                            </div>
                            <p className="text-[10px] text-secondary mt-2 opacity-60">👤 {r.userName || 'Citizen'}</p>
                        </div>
                    ))}
                </div>
            </AnimatedCard>

            {/* AI Briefing */}
            {clusters?.aiBriefing && (
                <AnimatedCard className="mb-8 bg-gradient-to-br from-primary/5 to-blue-50 border border-primary/15 rounded-2xl p-6 shadow-card">
                    <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2 uppercase tracking-wider">
                        {t('adminDashboard.aiBriefing')}
                        <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full normal-case">Groq</span>
                    </h3>
                    {clusters.aiBriefing.riskSummary && <p className="text-sm text-dark mb-3">{clusters.aiBriefing.riskSummary}</p>}
                    {clusters.aiBriefing.briefing && <p className="text-sm text-secondary mb-3 italic">{clusters.aiBriefing.briefing}</p>}
                    {clusters.aiBriefing.priorityActions?.length > 0 && (
                        <ul className="space-y-1.5">
                            {clusters.aiBriefing.priorityActions.map((a, i) => (
                                <li key={i} className="text-sm text-dark flex items-start gap-2">
                                    <span className="text-primary mt-0.5 font-bold">→</span><span>{a}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </AnimatedCard>
            )}

            {/* Charts */}
            {(barData || doughnutData) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {barData && (
                        <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-6 shadow-card">
                            <h3 className="text-sm font-semibold text-secondary mb-4 uppercase tracking-wider">{t('adminDashboard.reportsByArea')}</h3>
                            <Bar data={barData} options={chartOpts} />
                        </AnimatedCard>
                    )}
                    {doughnutData && (
                        <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-6 shadow-card">
                            <h3 className="text-sm font-semibold text-secondary mb-4 uppercase tracking-wider">{t('adminDashboard.outbreakConfidence')}</h3>
                            <Doughnut data={doughnutData} options={{ responsive: true, plugins: { legend: { labels: { color: '#2E2E2E' } } } }} />
                        </AnimatedCard>
                    )}
                </div>
            )}

            {/* Cluster alerts */}
            <h3 className="text-lg font-bold mb-4 text-dark">{t('adminDashboard.outbreakAlerts')}</h3>
            {clusters?.clusters?.length === 0 && (
                <div className="bg-emerald-50 border-2 border-risk-low/20 text-emerald-700 px-5 py-4 rounded-2xl shadow-card">
                    ✅ {t('adminDashboard.noOutbreaks', { hours: clusters.windowHours })}
                </div>
            )}
            {!clusters?.clusters && (
                <div className="bg-white rounded-2xl p-10 text-center text-secondary shadow-card">
                    <p className="text-4xl mb-3">📡</p>
                    <p className="font-medium">{t('adminDashboard.noClusterData')}</p>
                    <p className="text-sm mt-1">{t('adminDashboard.clusterDetectionHint')}</p>
                </div>
            )}
            <div className="space-y-4">
                {clusters?.clusters?.map((cluster, i) => {
                    const level = getLevel(cluster.confidence);
                    const s = CONFIDENCE_STYLES[level];
                    return (
                        <AnimatedCard key={i} delay={i * 0.06} className={`${s.bg} border-2 ${s.border} rounded-2xl p-6 shadow-card`}>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h4 className="font-bold text-dark text-lg">{cluster.area}</h4>
                                    <p className={`text-sm font-medium ${s.text}`}>{cluster.predictedDiseaseType}</p>
                                </div>
                                <span className={`${s.badge} text-xs font-bold px-3 py-1.5 rounded-full`}>
                                    {(cluster.confidence * 100).toFixed(0)}%
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {Object.entries(cluster.symptomCounts).map(([symptom, count]) => (
                                    <span key={symptom} className="bg-white text-secondary text-xs px-2.5 py-1 rounded-lg border border-gray-200 font-medium">
                                        {symptom}: {count}
                                    </span>
                                ))}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-secondary mb-1.5 uppercase">{t('adminDashboard.authorityActions')}</p>
                                <ul className="space-y-1">
                                    {cluster.recommendedAuthorityAction.map((a, j) => (
                                        <li key={j} className="text-sm text-dark flex items-start gap-2">
                                            <span className="text-warning mt-0.5">⚡</span><span>{a}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </AnimatedCard>
                    );
                })}
            </div>
        </PageTransition>
    );
}
