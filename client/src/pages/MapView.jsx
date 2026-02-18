import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchClusters } from '../api';
import { useSocket } from '../context/SocketContext';
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, Marker, useMap } from 'react-leaflet';
import { PageTransition, AnimatedCard } from '../components/Motion';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const LOCATION_COORDS = {
    'mumbai': [19.076, 72.8777], 'delhi': [28.6139, 77.209], 'chennai': [13.0827, 80.2707],
    'kolkata': [22.5726, 88.3639], 'bangalore': [12.9716, 77.5946], 'hyderabad': [17.385, 78.4867],
    'pune': [18.5204, 73.8567], 'ahmedabad': [23.0225, 72.5714], 'jaipur': [26.9124, 75.7873],
    'lucknow': [26.8467, 80.9462], 'andheri west': [19.136, 72.831], 'andheri east': [19.119, 72.854],
    'bandra': [19.054, 72.84], 'dadar': [19.018, 72.844], 'borivali': [19.23, 72.856],
    'thane': [19.218, 72.978], 'navi mumbai': [19.033, 73.029],
};

function getCoords(loc) {
    const key = loc.toLowerCase().trim();
    return LOCATION_COORDS[key] || [20.5937 + Math.random() * 8, 73 + Math.random() * 10];
}

const RISK_COLORS = { high: '#E85D75', medium: '#F0A500', low: '#4CAF82' };

// Disaster zone polygons for demo
const DISASTER_ZONES = [
    {
        name: 'Mumbai Flood Zone — Mithi River',
        level: 'danger',
        color: '#E85D75',
        coords: [
            [19.11, 72.85], [19.12, 72.87], [19.09, 72.88], [19.08, 72.86], [19.09, 72.84],
        ],
    },
    {
        name: 'Mumbai Coastal Storm Surge',
        level: 'danger',
        color: '#E85D75',
        coords: [
            [19.05, 72.80], [19.08, 72.82], [19.06, 72.84], [19.03, 72.83], [19.02, 72.81],
        ],
    },
    {
        name: 'Delhi Heat Zone — Central NCR',
        level: 'danger',
        color: '#E85D75',
        coords: [
            [28.60, 77.18], [28.65, 77.22], [28.63, 77.26], [28.58, 77.25], [28.57, 77.20],
        ],
    },
    {
        name: 'Thane — Moderate Risk',
        level: 'moderate',
        color: '#F0A500',
        coords: [
            [19.20, 72.96], [19.24, 72.99], [19.22, 73.02], [19.18, 73.00], [19.17, 72.97],
        ],
    },
    {
        name: 'Pune — Low Risk',
        level: 'safe',
        color: '#4CAF82',
        coords: [
            [18.50, 73.83], [18.55, 73.87], [18.53, 73.90], [18.48, 73.88], [18.47, 73.85],
        ],
    },
    {
        name: 'Navi Mumbai — Moderate Risk',
        level: 'moderate',
        color: '#F0A500',
        coords: [
            [19.01, 73.00], [19.05, 73.04], [19.03, 73.07], [18.99, 73.05], [18.98, 73.02],
        ],
    },
];

// Point-in-polygon (ray casting)
function isPointInPolygon(point, polygon) {
    const [px, py] = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Component to fly to user location
function FlyToUser({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, 13, { duration: 1.5 });
        }
    }, [position, map]);
    return null;
}

export default function MapView() {
    const [clusters, setClusters] = useState([]);
    const [clustersLoaded, setClustersLoaded] = useState(false);
    const [userPos, setUserPos] = useState(null);
    const [geoError, setGeoError] = useState('');
    const [dangerAlert, setDangerAlert] = useState(null);
    const { socket } = useSocket();
    const toast = useToast();
    const alertShownRef = useRef(new Set());

    useEffect(() => {
        async function load() {
            try { const { data } = await fetchClusters(); setClusters(data.clusters || []); }
            catch { /* silent — map still renders */ }
            finally { setClustersLoaded(true); }
        }
        load();
    }, []);

    // Geolocation watch
    useEffect(() => {
        if (!navigator.geolocation) {
            setGeoError('Geolocation not supported by your browser');
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setUserPos([pos.coords.latitude, pos.coords.longitude]);
                setGeoError('');
            },
            (err) => {
                setGeoError(`Location: ${err.message}`);
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // Geofencing check
    const checkGeofence = useCallback(() => {
        if (!userPos) return;

        for (const zone of DISASTER_ZONES) {
            if (zone.level === 'danger' && isPointInPolygon(userPos, zone.coords)) {
                const key = zone.name;
                if (!alertShownRef.current.has(key)) {
                    alertShownRef.current.add(key);
                    setDangerAlert(zone);
                    toast.error(`⚠️ You are in a danger zone: ${zone.name}`);

                    // Emit to admin
                    if (socket) {
                        socket.emit('geofence-breach', {
                            zone: zone.name,
                            level: zone.level,
                            userPosition: userPos,
                            timestamp: new Date().toISOString(),
                        });
                    }
                }
                return;
            }
        }
        setDangerAlert(null);
    }, [userPos, socket, toast]);

    useEffect(() => {
        checkGeofence();
    }, [checkGeofence]);

    return (
        <PageTransition>
            <div className="text-center mb-6">
                <h1 className="text-3xl font-extrabold text-dark mb-2">
                    Risk <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">Map</span>
                </h1>
                <p className="text-secondary text-sm">Live geolocation, disaster zones & outbreak clusters</p>
            </div>

            {/* Danger Zone Alert Banner */}
            <AnimatePresence>
                {dangerAlert && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-4 bg-red-100 border-2 border-risk-high/30 rounded-2xl px-5 py-4 alert-banner"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl animate-pulse">🔴</span>
                                <div>
                                    <p className="text-sm font-bold text-risk-high">DANGER ZONE DETECTED</p>
                                    <p className="text-xs text-risk-high/80">{dangerAlert.name} — Consider triggering SOS if in distress</p>
                                </div>
                            </div>
                            <a href="/user-dashboard" className="text-xs bg-risk-high text-white px-4 py-2 rounded-xl font-semibold hover:bg-red-600 transition">
                                Send SOS →
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* User coordinates */}
            {userPos && (
                <div className="flex justify-center mb-4">
                    <div className="bg-white border border-gray-200 rounded-full px-5 py-2.5 shadow-card text-sm">
                        <span className="text-secondary">📍 Your location:</span>
                        <span className="font-semibold text-dark ml-2">{userPos[0].toFixed(5)}, {userPos[1].toFixed(5)}</span>
                    </div>
                </div>
            )}
            {geoError && (
                <div className="text-center mb-4">
                    <p className="text-xs text-warning">{geoError}</p>
                </div>
            )}

            {/* Legend */}
            <div className="flex justify-center gap-6 mb-5">
                {[
                    { label: 'Danger Zone', color: 'bg-risk-high' },
                    { label: 'Moderate Risk', color: 'bg-warning' },
                    { label: 'Safe Zone', color: 'bg-risk-low' },
                    { label: 'Your Location', color: 'bg-primary' },
                ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-sm text-secondary">
                        <span className={`w-3.5 h-3.5 rounded-full ${item.color}`} />
                        {item.label}
                    </div>
                ))}
            </div>

            <div className="rounded-2xl overflow-hidden border-2 border-gray-200 shadow-card" style={{ height: '500px' }}>
                <MapContainer center={[20.5937, 78.9629]} zoom={5} className="h-full w-full" style={{ background: '#F4F6FB' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Fly to user position */}
                    {userPos && <FlyToUser position={userPos} />}

                    {/* User marker */}
                    {userPos && (
                        <Marker position={userPos}>
                            <Popup>
                                <div className="text-dark text-sm">
                                    <p className="font-bold text-primary">📍 Your Location</p>
                                    <p>{userPos[0].toFixed(5)}, {userPos[1].toFixed(5)}</p>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Disaster zone polygons — ALWAYS rendered */}
                    {DISASTER_ZONES.map((zone, i) => (
                        <Polygon
                            key={i}
                            positions={zone.coords}
                            pathOptions={{
                                color: zone.color,
                                fillColor: zone.color,
                                fillOpacity: 0.25,
                                weight: 2.5,
                                dashArray: zone.level === 'danger' ? '' : '5,5',
                            }}
                        >
                            <Popup>
                                <div className="text-dark text-sm">
                                    <p className="font-bold">{zone.name}</p>
                                    <p>Level: <span className="font-semibold" style={{ color: zone.color }}>{zone.level.toUpperCase()}</span></p>
                                </div>
                            </Popup>
                        </Polygon>
                    ))}

                    {/* Cluster markers — optional overlay */}
                    {clusters.map((cluster, i) => {
                        const coords = getCoords(cluster.area);
                        const level = cluster.confidence >= 0.7 ? 'high' : cluster.confidence >= 0.4 ? 'medium' : 'low';
                        return (
                            <CircleMarker key={i} center={coords}
                                radius={Math.max(12, cluster.totalReports * 2)}
                                fillColor={RISK_COLORS[level]} fillOpacity={0.45}
                                color={RISK_COLORS[level]} weight={2.5}>
                                <Popup>
                                    <div className="text-dark text-sm">
                                        <p className="font-bold">{cluster.area}</p>
                                        <p>{cluster.predictedDiseaseType}</p>
                                        <p>Confidence: {(cluster.confidence * 100).toFixed(0)}%</p>
                                        <p>Reports: {cluster.totalReports}</p>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        );
                    })}
                </MapContainer>
            </div>

            {/* Cluster list — shown only if clusters exist */}
            {clusters.length > 0 && (
                <div className="mt-6 space-y-3">
                    <h3 className="text-lg font-bold text-dark mb-2">Active Outbreak Clusters</h3>
                    {clusters.map((cluster, i) => {
                        const level = cluster.confidence >= 0.7 ? 'high' : cluster.confidence >= 0.4 ? 'medium' : 'low';
                        const border = level === 'high' ? 'border-risk-high/20' : level === 'medium' ? 'border-warning/20' : 'border-risk-low/20';
                        return (
                            <AnimatedCard key={i} delay={i * 0.05}
                                className={`bg-white border-2 ${border} rounded-2xl px-5 py-4 flex items-center justify-between shadow-card`}>
                                <div>
                                    <span className="font-semibold text-dark">{cluster.area}</span>
                                    <span className="text-sm text-secondary ml-2">— {cluster.predictedDiseaseType}</span>
                                </div>
                                <span className="text-sm text-secondary font-medium">{cluster.totalReports} reports</span>
                            </AnimatedCard>
                        );
                    })}
                </div>
            )}

            {/* Subtle info when no clusters — map still fully visible above */}
            {clusters.length === 0 && clustersLoaded && (
                <div className="mt-4 bg-emerald-50 border border-risk-low/20 rounded-2xl px-5 py-3 flex items-center gap-3">
                    <span className="text-lg">✅</span>
                    <p className="text-sm text-emerald-700">No outbreak clusters detected — all zones shown on the map above</p>
                </div>
            )}
        </PageTransition>
    );
}
