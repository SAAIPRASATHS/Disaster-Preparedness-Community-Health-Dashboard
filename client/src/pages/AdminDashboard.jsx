import { useState, useEffect, useCallback, useRef, lazy, Suspense, memo, useMemo } from 'react';
import { fetchClusters, fetchRisk, fetchSOSAlerts, fetchComplaints, fetchLiveAlerts, fetchResources, updateResourceStatus, resolveSOSAlert, resolveComplaint, fetchReports } from '../api';
import { useSocket } from '../context/SocketContext';
import { PageTransition, CardSkeleton } from '../components/Motion';
import { useToast } from '../components/Toast';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ResourceForm from '../components/ResourceForm';

// Lazy load heavy components — Chart.js (~200KB) and ResourceMap (Leaflet ~155KB)
const LazyResourceMap = lazy(() => import('../components/ResourceMap'));
const LazyCharts = lazy(() => import('../components/AdminCharts'));

const CONFIDENCE_STYLES = {
    high: { bg: 'bg-red-50', border: 'border-risk-high/20', text: 'text-risk-high', badge: 'bg-risk-high text-white' },
    medium: { bg: 'bg-amber-50', border: 'border-warning/20', text: 'text-warning', badge: 'bg-warning text-dark' },
    low: { bg: 'bg-emerald-50', border: 'border-risk-low/20', text: 'text-risk-low', badge: 'bg-risk-low text-white' },
};

const RESOURCE_ICONS = {
    fire_station: '🚒',
    police_station: '👮',
    hotel: '🏨',
    food_point: '🍱',
    rescue_center: '🆘'
};

function getLevel(c) { return c >= 0.7 ? 'high' : c >= 0.4 ? 'medium' : 'low'; }

// Lightweight card — pure CSS transitions, no framer-motion overhead
const Card = memo(({ children, className = '', delay = 0 }) => (
    <div
        className={`transition-shadow duration-200 hover:shadow-lg ${className}`}
        style={{ animationDelay: `${delay}s` }}
    >
        {children}
    </div>
));

// Lightweight section loader
const SectionLoader = () => (
    <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full" />
    </div>
);

export default function AdminDashboard() {
    const { t } = useTranslation();
    const [clusters, setClusters] = useState(null);
    const [riskData, setRiskData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
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

    const [districtFilter, setDistrictFilter] = useState('');
    const [sortByLocation, setSortByLocation] = useState(false);

    const addNotification = useCallback((notif) => {
        const entry = { ...notif, id: Date.now() + Math.random(), time: new Date() };
        setNotifications((prev) => [entry, ...prev].slice(0, 30));
    }, []);

    // Load initial data with error recovery
    useEffect(() => {
        const safetyTimer = setTimeout(() => { setLoading(false); }, 8000);

        async function load() {
            const errors = [];
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
                else errors.push('Clusters');
                if (riskRes.status === 'fulfilled') setRiskData(riskRes.value.data);
                else errors.push('Risk');
                if (sosRes.status === 'fulfilled') setSosAlerts(sosRes.value.data || []);
                else errors.push('SOS');
                if (compRes.status === 'fulfilled') setComplaints(compRes.value.data || []);
                else errors.push('Complaints');
                if (alertRes.status === 'fulfilled') setLiveAlerts(alertRes.value.data || []);
                else errors.push('Alerts');
                if (resourceRes.status === 'fulfilled') setResources(resourceRes.value.data || []);
                else errors.push('Resources');
                if (reportRes.status === 'fulfilled') setSymptomReports(reportRes.value.data || []);
                else errors.push('Reports');

                if (errors.length > 0) {
                    setLoadError(`Some data failed to load: ${errors.join(', ')}`);
                }
            } catch (err) {
                console.error('Admin Dashboard load error:', err);
                setLoadError('Failed to load dashboard data. Please refresh.');
            } finally {
                setLoading(false);
                clearTimeout(safetyTimer);
            }
        }
        load();
        return () => clearTimeout(safetyTimer);
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

    const handleResolveSOS = useCallback(async (id) => {
        try {
            await resolveSOSAlert(id);
            setSosAlerts((prev) => prev.map((a) => (a._id || a.id) === id ? { ...a, resolved: true } : a));
            toast.success(t('adminDashboard.sosResolved'));
        } catch {
            toast.error(t('adminDashboard.sosResolveFailed'));
        }
    }, [toast, t]);

    const handleResourceAdded = useCallback((newResource) => {
        setResources(prev => [newResource, ...prev]);
    }, []);

    const handleResolveComplaint = useCallback(async (id) => {
        try {
            await resolveComplaint(id);
            setComplaints((prev) => prev.map((c) => (c._id || c.id) === id ? { ...c, status: 'resolved' } : c));
            toast.success(t('adminDashboard.complaintResolved'));
        } catch {
            toast.error(t('adminDashboard.complaintResolveFailed'));
        }
    }, [toast, t]);

    const handleToggleFood = useCallback(async (id, foodAvailable) => {
        try {
            const { data } = await updateResourceStatus(id, { foodAvailable });
            setResources(prev => prev.map(r => r._id === id ? data : r));
            toast.success(t('adminDashboard.foodStatusUpdated', { name: data.name }));
        } catch {
            toast.error('Failed to update food status');
        }
    }, [toast, t]);

    // Memoize computed values
    const activeSOS = useMemo(() => sosAlerts.filter((a) => !a.resolved).length, [sosAlerts]);
    const pendingComplaints = useMemo(() => complaints.filter((c) => c.status === 'pending').length, [complaints]);
    const resolvedComplaints = useMemo(() => complaints.filter((c) => c.status === 'resolved').length, [complaints]);

    const processedSOS = useMemo(() => {
        let result = [...sosAlerts];
        if (districtFilter) {
            const filterLower = districtFilter.toLowerCase();
            result = result.filter(a => (a.location?.address || '').toLowerCase().includes(filterLower));
        }
        if (sortByLocation) {
            result.sort((a, b) => (a.location?.address || '').localeCompare(b.location?.address || ''));
        }
        return result;
    }, [sosAlerts, districtFilter, sortByLocation]);

    const processedComplaints = useMemo(() => {
        let result = [...complaints];
        if (districtFilter) {
            const filterLower = districtFilter.toLowerCase();
            result = result.filter(c => (c.location || '').toLowerCase().includes(filterLower));
        }
        if (sortByLocation) {
            result.sort((a, b) => (a.location || '').localeCompare(b.location || ''));
        }
        return result;
    }, [complaints, districtFilter, sortByLocation]);

    const processedReports = useMemo(() => {
        let result = [...symptomReports];
        if (districtFilter) {
            const filterLower = districtFilter.toLowerCase();
            result = result.filter(r => (r.location || '').toLowerCase().includes(filterLower));
        }
        if (sortByLocation) {
            result.sort((a, b) => (a.location || '').localeCompare(b.location || ''));
        }
        return result;
    }, [symptomReports, districtFilter, sortByLocation]);

    const stats = useMemo(() => [
        { value: clusters?.clustersDetected || 0, label: t('adminDashboard.activeAlerts'), color: 'text-rose-600', icon: '🚨', bg: 'bg-rose-50' },
        { value: activeSOS, label: t('adminDashboard.activeSOS'), color: 'text-amber-600', icon: '🆘', bg: 'bg-amber-50' },
        { value: pendingComplaints, label: t('adminDashboard.pendingComplaints'), color: 'text-indigo-600', icon: '📝', bg: 'bg-indigo-50' },
        { value: riskData?.risks?.[0]?.riskLevel || 'N/A', label: t('adminDashboard.weatherRisk'), color: 'text-primary', icon: '🌦️', bg: 'bg-blue-50' },
        { value: clusters?.totalGlobalReports || 0, label: t('adminDashboard.totalReports'), color: 'text-emerald-600', icon: '📊', bg: 'bg-emerald-50' },
    ], [clusters, activeSOS, pendingComplaints, riskData, t]);

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
            <div className="min-h-screen relative overflow-hidden px-4 py-8">
                {/* Error Banner */}
                {loadError && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
                        <span className="text-xl">⚠️</span>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-amber-800">{loadError}</p>
                            <p className="text-xs text-amber-600 mt-1">Dashboard is showing available data. Some sections may be empty.</p>
                        </div>
                        <button onClick={() => setLoadError(null)} className="text-amber-400 hover:text-amber-600 text-lg">✕</button>
                    </div>
                )}

                {/* Background Accent Glows — smaller and lighter for performance */}
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] -z-10" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px] -z-10" />

                <div className="text-center mb-12 relative z-10">
                    <div className="inline-block p-3 md:p-4 bg-white rounded-3xl shadow-xl shadow-slate-200/50 mb-6 md:mb-8 border border-slate-100">
                        <span className="text-3xl md:text-4xl block">🛡️</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 tracking-tighter uppercase">
                        {t('adminDashboard.title1')} <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">{t('adminDashboard.title2')}</span>
                    </h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">{t('adminDashboard.subtitle')}</p>
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">System Online</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Syncing</span>
                        </div>
                    </div>
                </div>

                {/* Critical Area Escalation Banner */}
                <AnimatePresence>
                    {criticalAreas.length > 0 && (
                        <div className="mb-10 space-y-3">
                            {criticalAreas.map((area, i) => (
                                <div key={i} className="bg-rose-600 px-6 py-4 rounded-3xl flex items-center gap-4 shadow-xl shadow-rose-600/20 overflow-hidden relative">
                                    <span className="text-3xl animate-bounce">🚨</span>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-rose-200 uppercase tracking-[0.2em] mb-0.5">{t('adminDashboard.criticalEscalation')}</p>
                                        <p className="text-sm font-black text-white uppercase tracking-tight">{area.area}: {area.message}</p>
                                    </div>
                                    <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                </div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>

                {/* Stats row — pure CSS, no framer-motion */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-6 mb-12">
                    {stats.map((stat, i) => (
                        <Card key={i} className="glass-card p-4 md:p-6 flex flex-col items-center text-center shadow-lg hover:scale-[1.02] transition-transform">
                            <div className={`w-10 h-10 md:w-12 md:h-12 ${stat.bg} rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl mb-3 md:mb-4 shadow-inner ring-2 md:ring-4 ring-white`}>
                                {stat.icon}
                            </div>
                            <p className={`text-3xl font-black ${stat.color} mb-1 tracking-tighter`}>{stat.value}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        </Card>
                    ))}
                </div>

                {/* Global Location Filters */}
                <div className="mb-8 flex flex-col sm:flex-row items-center gap-4 glass-card p-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <span className="p-2 bg-slate-900 rounded-xl text-white text-xs">🗺️</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Location Controls</span>
                    </div>
                    <div className="h-6 w-px bg-border hidden sm:block"></div>
                    <input 
                        type="text" 
                        placeholder="Filter by District / City..." 
                        className="premium-input !py-2 !text-sm flex-1 max-w-sm"
                        value={districtFilter}
                        onChange={(e) => setDistrictFilter(e.target.value)}
                    />
                    <button 
                        onClick={() => setSortByLocation(!sortByLocation)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-colors border ${sortByLocation ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                    >
                        {sortByLocation ? 'Sort: By District (A-Z)' : 'Sort: Newest First'}
                    </button>
                    {(districtFilter || sortByLocation) && (
                        <button 
                            onClick={() => { setDistrictFilter(''); setSortByLocation(false); }}
                            className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-700 underline underline-offset-2 ml-2"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Notification Panel */}
                    <Card className="glass-card p-5 md:p-8 h-96 overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <span className="p-2 bg-slate-900 rounded-xl text-white text-xs">🔔</span>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('adminDashboard.liveNotifications')}</h3>
                            </div>
                            {notifications.length > 0 && (
                                <span className="px-2.5 py-1 rounded-full bg-primary text-white text-[9px] font-black tracking-widest animate-pulse">{notifications.length} NEW</span>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                            {notifications.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3 grayscale opacity-40">
                                    <span className="text-4xl">📬</span>
                                    <p className="text-[9px] font-black uppercase tracking-widest">{t('adminDashboard.noNotifications')}</p>
                                </div>
                            ) : notifications.slice(0, 10).map((n) => (
                                <div
                                    key={n.id}
                                    className={`p-4 rounded-2xl border transition-colors ${n.severity === 'CRITICAL' ? 'bg-rose-50/50 border-rose-100 text-rose-700'
                                        : n.severity === 'HIGH' ? 'bg-amber-50/50 border-amber-100 text-amber-700'
                                            : 'bg-blue-50/50 border-indigo-100 text-indigo-700'}`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest">{n.type}</span>
                                        <span className="text-[8px] font-bold opacity-50">{new Date(n.time).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-[11px] font-bold leading-tight">{n.message}</p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Live SOS Alerts */}
                    <Card className="glass-card p-5 md:p-8 h-96 overflow-hidden flex flex-col">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="p-2 bg-rose-600 rounded-xl text-white text-xs">🆘</span>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('adminDashboard.sosAlerts')}</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                            {processedSOS.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3 grayscale opacity-40">
                                    <span className="text-4xl">😴</span>
                                    <p className="text-[9px] font-black uppercase tracking-widest">{districtFilter ? 'NO MATCHING SOS' : t('adminDashboard.noSOS')}</p>
                                </div>
                            ) : processedSOS.slice(0, 8).map((sos, i) => (
                                <div key={sos._id || i} className={`p-4 rounded-3xl border-2 transition-colors ${sos.resolved ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50 border-rose-100 shadow-md'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{sos.userName || 'Anonymous'}</p>
                                        {!sos.resolved && <span className="w-2 h-2 bg-rose-600 rounded-full" />}
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 mb-4 line-clamp-1">{sos.message || 'EMERGENCY ASSISTANCE REQUESTED'}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="grayscale opacity-50">📍</span>
                                        {sos.location?.address || `${sos.location?.lat?.toFixed(3)}, ${sos.location?.lng?.toFixed(3)}`}
                                    </p>
                                    {!sos.resolved ? (
                                        <button
                                            onClick={() => handleResolveSOS(sos._id || sos.id)}
                                            className="w-full bg-rose-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20"
                                        >
                                            {t('common.resolve')}
                                        </button>
                                    ) : (
                                        <div className="w-full py-2.5 rounded-xl bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-[0.2em] text-center border border-emerald-200">
                                            ✓ {t('common.resolved')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Resource Management */}
                <div className="mb-12">
                    <Card className="glass-card p-6 md:p-10 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8 md:mb-10 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-2xl shadow-xl">
                                    🚒
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                                        {t('adminDashboard.resourceManagement')}
                                    </h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                        {t('adminDashboard.totalNearbyResources', { count: resources.length })} · FULL CONTROL
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 relative z-10">
                            {/* New Resource Form */}
                            <div className="bg-slate-50/50 rounded-2xl md:rounded-3xl p-5 md:p-8 border border-slate-100">
                                <div className="mb-6 flex items-center gap-3">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Add New Intel</span>
                                    <div className="h-px flex-1 bg-slate-200" />
                                </div>
                                <ResourceForm onResourceAdded={handleResourceAdded} />
                            </div>

                            <div className="space-y-4 overflow-y-auto max-h-[500px] pr-4 scrollbar-hide">
                                <div className="mb-4 flex items-center gap-3">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Live Directory</span>
                                    <div className="h-px flex-1 bg-slate-200" />
                                </div>
                                {resources.length === 0 ? (
                                    <div className="py-20 flex flex-col items-center justify-center grayscale opacity-30 text-slate-400 gap-4">
                                        <span className="text-5xl">📄</span>
                                        <p className="text-[10px] font-black uppercase tracking-widest">{t('adminDashboard.noResources')}</p>
                                    </div>
                                ) : resources.slice(0, 20).map((res) => (
                                    <div key={res._id} className="p-5 rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-5">
                                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl border border-slate-100">
                                                    {RESOURCE_ICONS[res.type] || '📍'}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{res.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{res.address}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-3">
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                                    {res.type.replace('_', ' ')}
                                                </span>
                                                {res.type === 'food_point' && (
                                                    <button
                                                        onClick={() => handleToggleFood(res._id, !res.status.foodAvailable)}
                                                        className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors ${res.status.foodAvailable
                                                            ? 'bg-emerald-500 text-white'
                                                            : 'bg-rose-500 text-white'}`}
                                                    >
                                                        {res.status.foodAvailable ? `STOCK: YES` : `STOCK: NO`}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Resource Map — lazy loaded */}
                <div className="mb-8">
                    <Suspense fallback={<SectionLoader />}>
                        <LazyResourceMap 
                            resources={resources} 
                            onToggleFood={handleToggleFood} 
                            sosAlerts={processedSOS} 
                            complaints={processedComplaints} 
                            reports={processedReports} 
                        />
                    </Suspense>
                </div>

                {/* Live Complaints */}
                <Card className="glass-card p-6 md:p-10 mb-12 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-xl md:text-2xl shadow-xl shadow-amber-500/20 ring-2 md:ring-4 ring-white">
                                📝
                            </div>
                            <div>
                                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">{t('adminDashboard.complaints')}</h3>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                                        {pendingComplaints} {t('common.pending')}
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                        {resolvedComplaints} {t('common.resolved')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 overflow-y-auto max-h-[400px] pr-4 scrollbar-hide relative z-10">
                        {processedComplaints.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center grayscale opacity-30 text-slate-400 gap-4">
                                <span className="text-5xl">📫</span>
                                <p className="text-[10px] font-black uppercase tracking-widest">{districtFilter ? 'NO MATCHING COMPLAINTS' : t('adminDashboard.noComplaints')}</p>
                            </div>
                        ) : processedComplaints.slice(0, 10).map((c, i) => (
                            <div key={c._id || i} className={`p-6 rounded-[2rem] border transition-colors ${c.status === 'resolved' ? 'bg-emerald-50/50 border-emerald-100 opacity-60' : 'bg-white border-slate-100 shadow-sm'}`}>
                                <div className="flex items-start justify-between gap-6">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 leading-relaxed">{c.description}</p>
                                        <div className="flex flex-wrap items-center gap-3 mt-4">
                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full">
                                                <span className="text-[10px]">📍</span>
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{c.location}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full">
                                                <span className="text-[10px]">👤</span>
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{c.userName || 'Citizen'}</span>
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-400 tracking-wider">
                                                {c.createdAt ? new Date(c.createdAt).toLocaleString() : 'N/A'}
                                            </span>
                                        </div>

                                        {/* Complaint image attachment */}
                                        {(c.imageUrl || c.image_url) && (
                                            <div className="mt-4">
                                                <a
                                                    href={c.imageUrl || c.image_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-block group"
                                                    title="View full image"
                                                >
                                                    <div className="relative rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                                                        <img
                                                            src={c.imageUrl || c.image_url}
                                                            alt="Complaint attachment"
                                                            className="h-28 w-auto max-w-[220px] object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                                                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black text-white uppercase tracking-widest bg-slate-900/60 px-3 py-1 rounded-full backdrop-blur-sm">
                                                                View Full
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                                                        <span>📎</span> Photo Attached
                                                    </p>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-shrink-0">
                                        {c.status === 'pending' ? (
                                            <button
                                                onClick={() => handleResolveComplaint(c._id || c.id)}
                                                className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                                            >
                                                {t('adminDashboard.markResolved')}
                                            </button>
                                        ) : (
                                            <div className="px-6 py-2.5 bg-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-300">
                                                ✓ {t('common.resolved')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Live Symptom Reports */}
                <Card className="glass-card p-6 md:p-10 mb-12 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-2xl flex items-center justify-center text-xl md:text-2xl shadow-xl shadow-primary/20 ring-2 md:ring-4 ring-white">
                                🌡️
                            </div>
                            <div>
                                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">{t('adminDashboard.symptomReports')}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">
                                    {processedReports.length} {t('common.total')} REPORTS DETECTED
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto max-h-[500px] pr-4 scrollbar-hide relative z-10">
                        {processedReports.length === 0 ? (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center grayscale opacity-30 text-slate-400 gap-4">
                                <span className="text-5xl">🕵️</span>
                                <p className="text-[10px] font-black uppercase tracking-widest">{districtFilter ? 'NO MATCHING REPORTS' : t('adminDashboard.noReports')}</p>
                            </div>
                        ) : processedReports.slice(0, 12).map((r, i) => (
                            <div key={r._id || i} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{r.location}</p>
                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : ''}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {r.symptoms.map(s => (
                                        <span key={s} className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest">{s}</span>
                                    ))}
                                </div>
                                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center gap-2">
                                    <div className="w-5 h-5 bg-slate-100 rounded-lg flex items-center justify-center text-[10px]">👤</div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{r.userName || 'Citizen'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* AI Briefing */}
                {clusters?.aiBriefing && (
                    <Card className="mb-12 glass-card p-6 md:p-10 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-xl md:text-2xl shadow-xl shadow-slate-900/10">
                                    🧠
                                </div>
                                <div>
                                    <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">
                                        {t('adminDashboard.aiBriefing')}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">AI-POWERED INTELLIGENCE · GROQ LPU</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
                            <div className="space-y-6">
                                {clusters.aiBriefing.riskSummary && (
                                    <div className="bg-white/50 rounded-3xl p-6 border border-white shadow-inner">
                                        <p className="text-sm font-bold text-slate-700 leading-relaxed italic">"{clusters.aiBriefing.riskSummary}"</p>
                                    </div>
                                )}
                                {clusters.aiBriefing.briefing && (
                                    <div className="p-2">
                                        <p className="text-[13px] font-medium text-slate-500 leading-relaxed">{clusters.aiBriefing.briefing}</p>
                                    </div>
                                )}
                            </div>

                            {clusters.aiBriefing.priorityActions?.length > 0 && (
                                <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-6">Immediate Tactical Actions</p>
                                    <ul className="space-y-4">
                                        {clusters.aiBriefing.priorityActions.map((a, i) => (
                                            <li key={i} className="flex items-start gap-4">
                                                <span className="w-6 h-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs font-black shrink-0">{i + 1}</span>
                                                <span className="text-slate-300 text-[13px] font-medium leading-snug">{a}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {/* Charts — lazy loaded */}
                <Suspense fallback={<SectionLoader />}>
                    <LazyCharts clusters={clusters} t={t} />
                </Suspense>

                {/* Cluster alerts */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 mt-12">
                    <div className="w-10 h-10 bg-rose-600 rounded-2xl flex items-center justify-center text-lg shadow-lg shadow-rose-600/20 shrink-0">📡</div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">{t('adminDashboard.outbreakAlerts')}</h3>
                </div>

                {clusters?.clusters?.length === 0 && (
                    <div className="glass-card p-12 text-center relative overflow-hidden">
                        <span className="text-5xl block mb-6">✅</span>
                        <p className="text-sm font-black text-emerald-600 uppercase tracking-[0.2em]">{t('adminDashboard.noOutbreaks', { hours: clusters.windowHours })}</p>
                    </div>
                )}

                {!clusters?.clusters && (
                    <div className="glass-card p-16 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-inner mx-auto mb-8 border border-slate-100">📡</div>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-3">{t('adminDashboard.noClusterData')}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('adminDashboard.clusterDetectionHint')}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    {clusters?.clusters?.map((cluster, i) => {
                        const level = getLevel(cluster.confidence);
                        return (
                            <Card key={i} className={`glass-card p-6 md:p-10 relative overflow-hidden border-l-[6px] ${level === 'high' ? 'border-l-rose-600' : level === 'medium' ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
                                <div className="flex items-start md:items-center justify-between mb-8 relative z-10 flex-col md:flex-row gap-4">
                                    <div>
                                        <h4 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase mb-1">{cluster.area}</h4>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${level === 'high' ? 'bg-rose-600 animate-pulse' : level === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{cluster.predictedDiseaseType}</p>
                                        </div>
                                    </div>
                                    <div className={`px-5 py-2.5 rounded-2xl ${level === 'high' ? 'bg-rose-600 text-white' : level === 'medium' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'} text-sm font-black tracking-tighter`}>
                                        {(cluster.confidence * 100).toFixed(0)}%
                                    </div>
                                </div>

                                <div className="mb-8 relative z-10">
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4">Symptom Distribution</p>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(cluster.symptomCounts).map(([symptom, count]) => (
                                            <span key={symptom} className="px-3.5 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                                {symptom}: <span className="text-slate-900 ml-1">{count}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="relative z-10">
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4">{t('adminDashboard.authorityActions')}</p>
                                    <div className="space-y-3">
                                        {cluster.recommendedAuthorityAction.map((a, j) => (
                                            <div key={j} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3 hover:bg-white transition-colors">
                                                <span className="text-amber-500 text-sm mt-0.5">⚡</span>
                                                <span className="text-[13px] font-bold text-slate-600 leading-snug">{a}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                <div className="mt-20 text-center relative z-10">
                    <div className="inline-flex items-center gap-4 px-6 py-2 rounded-full bg-slate-900/5 backdrop-blur-sm border border-slate-900/10">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">Central Command Hub v2.0</span>
                        <div className="w-1 h-1 bg-primary rounded-full" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">{new Date().getFullYear()} Resilience Network</span>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
