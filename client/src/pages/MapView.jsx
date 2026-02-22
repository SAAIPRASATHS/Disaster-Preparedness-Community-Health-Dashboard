import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fetchClusters, fetchResources } from '../api';
import { useSocket } from '../context/SocketContext';
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, Marker, useMap } from 'react-leaflet';
import { PageTransition, AnimatedCard } from '../components/Motion';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster';

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

const RESOURCE_ICONS = {
    fire_station: '🚒',
    police_station: '👮',
    hotel: '🏨',
    food_point: '🍱',
    hospital: '🏥',
    government_office: '🏛️',
    rescue_center: '🆘'
};

const EMERGENCY_ICONS = {
    police: L.divIcon({
        html: '<div style="background:#2563EB;padding:2px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;border:1.5px solid #fff;transform:translateZ(0)">👤</div>',
        className: 'custom-police-marker',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    }),
    fire: L.divIcon({
        html: '<div style="background:#DC2626;padding:2px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;border:1.5px solid #fff;transform:translateZ(0)">🔥</div>',
        className: 'custom-fire-marker',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    })
};

// Disaster zone polygons for demo
const DISASTER_ZONES = [
    {
        name: 'Mumbai Flood Zone — Mithi River',
        level: 'danger',
        color: '#E85D75',
        coords: [[19.11, 72.85], [19.12, 72.87], [19.09, 72.88], [19.08, 72.86], [19.09, 72.84]],
    },
    {
        name: 'Mumbai Coastal Storm Surge',
        level: 'danger',
        color: '#E85D75',
        coords: [[19.05, 72.80], [19.08, 72.82], [19.06, 72.84], [19.03, 72.83], [19.02, 72.81]],
    },
    {
        name: 'Delhi Heat Zone — Central NCR',
        level: 'danger',
        color: '#E85D75',
        coords: [[28.60, 77.18], [28.65, 77.22], [28.63, 77.26], [28.58, 77.25], [28.57, 77.20]],
    },
];

// Haversine Distance Helper
function haversineDistance(coords1, coords2) {
    const [lat1, lon1] = coords1;
    const [lat2, lon2] = coords2;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

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
// Component to fly to user location once
function FlyToUser({ position }) {
    const map = useMap();
    const hasFlown = useRef(false);

    useEffect(() => {
        if (position && !hasFlown.current) {
            map.flyTo(position, 13, { duration: 1.5 });
            hasFlown.current = true;
        }
    }, [position, map]);
    return null;
}

// Emergency Services Layer Component
function EmergencyServicesLayer({ active, onLoading, filters }) {
    const map = useMap();
    const [markers, setMarkers] = useState([]);
    const lastFetchRef = useRef(null);
    const toast = useToast();
    const { t } = useTranslation();

    const fetchEmergencyServices = useCallback(async () => {
        if (!active) return;

        const zoom = map.getZoom();
        if (zoom < 11) {
            toast.info(t('map.zoomInForServices'));
            setMarkers([]);
            return;
        }

        const center = map.getCenter();
        const lat = center.lat;
        const lng = center.lng;

        // Debounce / Prevention of too many requests
        const now = Date.now();
        if (lastFetchRef.current && now - lastFetchRef.current < 1500) return;
        lastFetchRef.current = now;

        onLoading(true);
        try {
            const radius = 5000; // 5km
            const query = `
                [out:json][timeout:25];
                (
                  node["amenity"="police"](around:${radius}, ${lat}, ${lng});
                  node["amenity"="fire_station"](around:${radius}, ${lat}, ${lng});
                );
                out body;
            `;
            const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
            const response = await fetch(url);

            if (!response.ok) throw new Error('Overpass API Error');

            const data = await response.json();

            const newMarkers = data.elements.map(element => ({
                id: element.id,
                lat: element.lat,
                lon: element.lon,
                type: element.tags.amenity === 'police' ? 'police' : 'fire',
                name: element.tags.name || (element.tags.amenity === 'police' ? 'Police Station' : 'Fire Station'),
                address: element.tags['addr:street'] || element.tags['addr:city'] || 'Nearby'
            }));

            setMarkers(newMarkers);

            if (newMarkers.length === 0) {
                toast.info(t('map.noServicesNearby'));
            } else {
                toast.success(t('map.foundServices', { count: newMarkers.length }));
            }
        } catch (error) {
            console.error('Error fetching emergency services:', error);
            toast.error(t('map.fetchError'));
        } finally {
            onLoading(false);
        }
    }, [map, active, onLoading, toast, t]);

    useEffect(() => {
        if (active) {
            fetchEmergencyServices();
        } else {
            setMarkers([]);
        }
    }, [active, fetchEmergencyServices]);

    // Re-fetch on map move
    useEffect(() => {
        const handleMoveEnd = () => {
            if (active) fetchEmergencyServices();
        };
        map.on('moveend', handleMoveEnd);
        return () => map.off('moveend', handleMoveEnd);
    }, [map, active, fetchEmergencyServices]);

    if (!active) return null;

    return markers
        .filter(m => filters[m.type])
        .map(marker => (
            <Marker
                key={marker.id}
                position={[marker.lat, marker.lon]}
                icon={marker.type === 'police' ? EMERGENCY_ICONS.police : EMERGENCY_ICONS.fire}
            >
                <Popup>
                    <div className="text-dark text-sm">
                        <p className="font-bold border-bottom pb-1 mb-1">
                            {marker.type === 'police' ? '👮 ' : '🚒 '}{marker.name}
                        </p>
                        <p className="text-xs text-secondary">{marker.address}</p>
                        <p className="text-[10px] text-primary mt-1 font-semibold uppercase">{marker.type} service</p>
                    </div>
                </Popup>
            </Marker>
        ));
}

export default function MapView() {
    const { t } = useTranslation();
    const [clusters, setClusters] = useState([]);
    const [resources, setResources] = useState([]);
    const [clustersLoaded, setClustersLoaded] = useState(false);
    const [userPos, setUserPos] = useState(null);
    const [geoError, setGeoError] = useState('');
    const [dangerAlert, setDangerAlert] = useState(null);
    const [showEmergency, setShowEmergency] = useState(false);
    const [emergencyLoading, setEmergencyLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [nearbyServices, setNearbyServices] = useState([]);
    const [scanAttempted, setScanAttempted] = useState(false);
    const mapRef = useRef(null);

    // Legend Filtering
    const [filters, setFilters] = useState({
        dangerZone: true,
        userLocation: true,
        fire: true,
        police: true,
        hotel: true,
        food: true,
        hospital: true,
        government: true,
        rescue: true,
    });

    const toggleFilter = (key) => {
        setFilters(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const { socket } = useSocket();
    const toast = useToast();
    const alertShownRef = useRef(new Set());

    // Default center coordinates (Mumbai) used when geolocation is unavailable
    const DEFAULT_CENTER = [19.076, 72.8777];

    useEffect(() => {
        async function load() {
            try {
                const [clusterRes, resourceRes] = await Promise.allSettled([
                    fetchClusters(),
                    fetchResources()
                ]);

                if (clusterRes.status === 'fulfilled') {
                    setClusters(clusterRes.value.data.clusters || []);
                }

                if (resourceRes.status === 'fulfilled') {
                    setResources(resourceRes.value.data || []);
                }
            }
            catch (err) { console.error('Load Map Data Error:', err); }
            finally { setClustersLoaded(true); }
        }
        load();
    }, []); // Run only once on mount


    // Handle real-time resource updates
    useEffect(() => {
        if (socket) {
            socket.on('resource-update', (updated) => {
                setResources(prev => prev.map(r => r._id === updated._id ? updated : r));
            });
            return () => socket.off('resource-update');
        }
    }, [socket]);

    // Geolocation watch: Use a ref to ensure we don't restart multiple times
    const isWatchStarted = useRef(false);
    useEffect(() => {
        if (!navigator.geolocation || isWatchStarted.current) return;

        isWatchStarted.current = true;
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const newCoords = [pos.coords.latitude, pos.coords.longitude];
                setUserPos(prev => {
                    if (prev && haversineDistance(prev, newCoords) < 0.01) return prev; // Ignore tiny movements (<10m)
                    return newCoords;
                });
                setGeoError('');

                // Auto-scan once
                setScanAttempted(prev => {
                    if (!prev) handleScanArea(newCoords);
                    return true;
                });
            },
            (err) => {
                setGeoError(`Location: ${err.message}`);
                isWatchStarted.current = false;
            },
            { enableHighAccuracy: true, maximumAge: 60000, timeout: 20000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [t]);

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            toast.error(t('map.geoNotSupported'));
            return;
        }

        toast.info(t('map.requestingLocation'));
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const newCoords = [pos.coords.latitude, pos.coords.longitude];
                setUserPos(newCoords);
                if (mapRef.current) {
                    mapRef.current.flyTo(newCoords, 14);
                }
                toast.success(t('map.locationFound'));
                handleScanArea(newCoords);
            },
            (err) => {
                toast.error(t('map.locationDenied') || err.message);
                // Fallback: If denied, scan from current map center
                handleScanArea(null);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleScanArea = async (coords = userPos) => {
        setIsScanning(true);
        toast.info(t('home.autoScanning') + '...');

        // Fallback to map center if no coordinates provided
        const activeCoords = coords || (mapRef.current ? [mapRef.current.getCenter().lat, mapRef.current.getCenter().lng] : DEFAULT_CENTER);

        // Faster response: reduced delay from 1500ms to 400ms
        setTimeout(() => {
            const nearby = resources
                .map(res => ({
                    ...res,
                    distance: haversineDistance(activeCoords, [res.location.coordinates[1], res.location.coordinates[0]])
                }))
                .filter(res => res.distance < 20) // Increased radius to 20km for better coverage
                .sort((a, b) => a.distance - b.distance);

            setNearbyServices(nearby);
            setIsScanning(false);
            if (nearby.length > 0) {
                toast.success(t('map.foundServices', { count: nearby.length }));
            } else {
                toast.info(t('map.noServicesInRadius'));
            }
        }, 400);
    };

    const locateOnMap = (coords) => {
        if (mapRef.current) {
            mapRef.current.flyTo(coords, 15);
        }
    };

    // Geofencing check
    const checkGeofence = useCallback(() => {
        if (!userPos) return;

        for (const zone of DISASTER_ZONES) {
            if (zone.level === 'danger' && isPointInPolygon(userPos, zone.coords)) {
                const key = zone.name;
                if (!alertShownRef.current.has(key)) {
                    alertShownRef.current.add(key);
                    setDangerAlert(zone);
                    toast.error(t('map.dangerZoneAlert', { zone: zone.name }));

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
    }, [userPos, socket, toast, t]);

    useEffect(() => {
        checkGeofence();
    }, [checkGeofence]);

    return (
        <PageTransition>
            <div className="text-center mb-12 pt-8">
                <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl font-black text-slate-900 mb-4 tracking-tight leading-tight"
                >
                    {t('map.title1')} <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">{t('map.title2')}</span>
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-slate-500 max-w-2xl mx-auto text-lg font-medium"
                >
                    {t('map.subtitle')}
                </motion.p>
            </div>

            {/* Danger Zone Alert Banner */}
            <AnimatePresence>
                {dangerAlert && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-8 overflow-hidden"
                    >
                        <div className="bg-risk-high/5 border-2 border-risk-high/20 rounded-[2rem] px-8 py-6 flex items-center justify-between shadow-lg shadow-risk-high/5">
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-risk-high animate-pulse rounded-2xl shadow-lg shadow-risk-high/40">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <div>
                                    <p className="text-lg font-black text-risk-high leading-tight">{t('map.dangerZoneDetected')}</p>
                                    <p className="text-sm font-bold text-slate-500 mt-1">{dangerAlert.name} • {t('map.considerSOS')}</p>
                                </div>
                            </div>
                            <a href="/user-dashboard" className="premium-button bg-risk-high text-white shadow-risk-high/20">
                                {t('map.sendSOS')}
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Legend & Controls - Redefined as a clean glass tray */}
            <div className="max-w-6xl mx-auto mb-8 p-4 glass-card rounded-[2.5rem] flex flex-wrap justify-center items-center gap-3 shadow-2xl relative z-[1000]">
                {[
                    { id: 'dangerZone', label: t('map.dangerZone'), color: 'bg-risk-high' },
                    { id: 'fire', label: t('map.fire'), color: 'bg-red-500' },
                    { id: 'police', label: t('map.police'), color: 'bg-blue-600' },
                    { id: 'hotel', label: t('map.hotel'), color: 'bg-orange-400' },
                    { id: 'food', label: t('map.food'), color: 'bg-emerald-500' },
                    { id: 'hospital', label: t('map.hospital'), color: 'bg-teal-500' },
                    { id: 'government', label: t('map.government'), color: 'bg-indigo-500' },
                    { id: 'rescue', label: t('adminDashboard.rescueCenter'), color: 'bg-rose-600' },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => toggleFilter(item.id)}
                        className={`flex items-center gap-2.5 text-xs font-black uppercase tracking-wider px-4 py-2 rounded-full border-2 transition-all duration-300 transform active:scale-95 ${filters[item.id]
                            ? 'bg-white border-slate-100 text-slate-900 shadow-sm scale-105'
                            : 'bg-slate-50/50 border-transparent text-slate-400 opacity-60'
                            }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${item.color} ${!filters[item.id] && 'opacity-30'}`} />
                        {item.label}
                    </button>
                ))}

                <div className="w-px h-6 bg-slate-200 mx-2 hidden md:block" />

                {/* Main Action Toggles */}
                <div className="flex gap-3">
                    <button
                        onClick={handleLocateMe}
                        className={`flex items-center gap-2.5 text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-2xl border-2 transition-all duration-300 transform active:scale-95 bg-white border-slate-100 text-slate-900 shadow-sm hover:border-primary hover:text-primary`}
                    >
                        <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                        {t('map.yourLocation')}
                    </button>

                    <button
                        onClick={() => setShowEmergency(!showEmergency)}
                        className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border-2 ${showEmergency
                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105'
                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300 shadow-sm'
                            }`}
                    >
                        <span className="mr-2">{showEmergency ? '🚨' : '🏥'}</span>
                        {t('map.emergencyServices')}
                    </button>

                    <button
                        onClick={() => handleScanArea()}
                        disabled={isScanning}
                        className={`premium-button px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 ${isScanning ? 'opacity-50 cursor-not-allowed grayscale' : 'shadow-emerald-500/20'
                            }`}
                        style={!isScanning ? { background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' } : {}}
                    >
                        {isScanning ? (
                            <div className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full" />
                        ) : '📡'}
                        {t('map.scanAreaForHelp')}
                    </button>
                </div>
            </div>

            <div className="relative rounded-[3rem] overflow-hidden border-4 border-white shadow-2xl shadow-slate-200/50 group transition-all duration-500" style={{ height: '600px' }}>
                <MapContainer
                    center={[20.5937, 78.9629]}
                    zoom={5}
                    className="h-full w-full"
                    style={{ background: '#F4F6FB' }}
                    ref={mapRef}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {userPos && filters.userLocation && <FlyToUser position={userPos} />}

                    {userPos && filters.userLocation && (
                        <Marker position={userPos}>
                            <Popup>
                                <div className="text-slate-900 text-xs font-medium p-2">
                                    <p className="font-black text-primary uppercase tracking-widest mb-1">{t('map.yourLocation')}</p>
                                    <p className="text-slate-400 font-bold">{userPos[0].toFixed(5)}, {userPos[1].toFixed(5)}</p>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    <EmergencyServicesLayer active={showEmergency} onLoading={setEmergencyLoading} filters={filters} />

                    {/* Resources Markers - Clustered and Optimized for Performance */}
                    <MarkerClusterGroup
                        key={Object.values(filters).join(',')} // Force re-render when filters change
                        chunkedLoading
                        maxClusterRadius={60}
                        spiderfyOnMaxZoom={true}
                        showCoverageOnHover={false}
                    >
                        {useMemo(() => resources.map((res) => {
                            const typeMap = {
                                fire_station: 'fire',
                                police_station: 'police',
                                hotel: 'hotel',
                                food_point: 'food',
                                hospital: 'hospital',
                                government_office: 'government',
                                rescue_center: 'rescue'
                            };
                            const filterKey = typeMap[res.type];
                            if (filterKey && !filters[filterKey]) return null;

                            // Lightweight micro-markers for fast rendering
                            const borderColor = res.type === 'rescue_center' ? '#E11D48' : res.type === 'hospital' ? '#10B981' : '#2563EB';
                            let iconHtml = `<div style="background:#fff;border:1.5px solid ${borderColor};border-radius:8px;padding:1px;display:flex;align-items:center;justify-content:center;font-size:12px;transform:translateZ(0)">${RESOURCE_ICONS[res.type] || '📍'}</div>`;

                            let icon = L.divIcon({
                                html: iconHtml,
                                className: '',
                                iconSize: [24, 24],
                                iconAnchor: [12, 12]
                            });

                            return (
                                <Marker
                                    key={res._id}
                                    position={[res.location.coordinates[1], res.location.coordinates[0]]}
                                    icon={icon}
                                >
                                    <Popup>
                                        <div className="text-slate-900 text-sm p-2 w-48">
                                            <p className="font-black text-lg tracking-tight mb-2 leading-tight">{res.name}</p>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{res.type.replace('_', ' ')}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">{res.address}</p>
                                            {res.contact && (
                                                <div className="border-t pt-4">
                                                    <a href={`tel:${res.contact}`} className="block bg-primary/10 text-primary py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-center hover:bg-primary hover:text-white transition-colors">
                                                        Call
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        }), [resources, filters, t])}
                    </MarkerClusterGroup>

                    {filters.dangerZone && DISASTER_ZONES.map((zone, i) => (
                        <Polygon
                            key={i}
                            positions={zone.coords}
                            pathOptions={{
                                color: zone.color,
                                fillColor: zone.color,
                                fillOpacity: 0.15,
                                weight: 3,
                                dashArray: '8, 8'
                            }}
                        >
                            <Popup>
                                <div className="text-dark text-xs p-2">
                                    <p className="font-black text-lg tracking-tight mb-1">{zone.name}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: zone.color }}>
                                        {t('map.level')}: {zone.level}
                                    </p>
                                </div>
                            </Popup>
                        </Polygon>
                    ))}
                </MapContainer>
            </div>

            {/* Nearby Services List Card Tray */}
            <AnimatePresence>
                {nearbyServices.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-20 max-w-7xl mx-auto px-4"
                    >
                        <div className="flex flex-col md:flex-row items-baseline justify-between gap-4 mb-10 border-b-2 border-slate-100 pb-8">
                            <div>
                                <h3 className="text-4xl font-black text-slate-900 tracking-tighter">
                                    {t('map.hospitalsNearMe')}
                                </h3>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-3">
                                    {t('map.detectedInProximity')}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-2xl">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Scan Radius</span>
                                <span className="text-lg font-black text-primary tracking-tighter">5.0 km</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {nearbyServices.map((res, i) => (
                                <motion.div
                                    key={res._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="glass-card p-8 rounded-[2.5rem] flex flex-col group relative overflow-hidden"
                                >
                                    {/* Subtle distance glow */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10" />

                                    <div className="flex items-start justify-between mb-8 relative z-10">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-rose-500/5 flex items-center justify-center text-4xl group-hover:scale-110 group-hover:bg-rose-500/10 transition-all duration-500 border border-rose-500/10 shadow-inner">
                                                {RESOURCE_ICONS[res.type] || '🏥'}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 text-xl tracking-tight leading-tight group-hover:text-primary transition-colors">{res.name}</h4>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">
                                                        {t('map.activeNow')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <span className="text-3xl font-black text-primary tracking-tighter leading-none">{res.distance.toFixed(1)}</span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{t('map.kmAway')}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 mt-auto relative z-10">
                                        <button
                                            onClick={() => locateOnMap([res.location.coordinates[1], res.location.coordinates[0]])}
                                            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-500 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                        >
                                            {t('map.locateOnMap')}
                                        </button>
                                        <a
                                            href={`tel:${res.contact}`}
                                            className="flex-1 premium-button p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2"
                                        >
                                            <span>📞</span> {t('map.contact')}
                                        </a>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </PageTransition>
    );
}
