import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchClusters, fetchResources } from '../api';
import { useSocket } from '../context/SocketContext';
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, Marker, useMap } from 'react-leaflet';
import { PageTransition, AnimatedCard } from '../components/Motion';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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

const RESOURCE_ICONS = {
    fire_station: '🚒',
    police_station: '👮',
    hotel: '🏨',
    food_point: '🍱',
    hospital: '🏥',
    government_office: '🏛️'
};

const EMERGENCY_ICONS = {
    police: L.divIcon({
        html: '<div style="background-color: blue; padding: 5px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);">👤</div>',
        className: 'custom-police-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    }),
    fire: L.divIcon({
        html: '<div style="background-color: red; padding: 5px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);">🔥</div>',
        className: 'custom-fire-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
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
                // Always fetch resources — use userPos if available, otherwise default to Mumbai
                const fetchLat = userPos ? userPos[0] : DEFAULT_CENTER[0];
                const fetchLon = userPos ? userPos[1] : DEFAULT_CENTER[1];

                const [clusterRes, resourceRes] = await Promise.all([
                    fetchClusters(),
                    fetchResources(fetchLat, fetchLon, 50000) // 50km radius
                ]);
                setClusters(clusterRes.data.clusters || []);
                setResources(resourceRes.data || []);
            }
            catch (err) { console.error('Load Map Data Error:', err); }
            finally { setClustersLoaded(true); }
        }
        load();
    }, [userPos]);


    // Handle real-time resource updates
    useEffect(() => {
        if (socket) {
            socket.on('resource-update', (updated) => {
                setResources(prev => prev.map(r => r._id === updated._id ? updated : r));
            });
            return () => socket.off('resource-update');
        }
    }, [socket]);

    // Geolocation watch
    useEffect(() => {
        if (!navigator.geolocation) {
            setGeoError(t('map.geoNotSupported'));
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
    }, [t]);

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
            <div className="text-center mb-6">
                <h1 className="text-3xl font-extrabold text-dark mb-2">
                    {t('map.title1')} <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">{t('map.title2')}</span>
                </h1>
                <p className="text-secondary text-sm">{t('map.subtitle')}</p>
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
                                    <p className="text-sm font-bold text-risk-high">{t('map.dangerZoneDetected')}</p>
                                    <p className="text-xs text-risk-high/80">{dangerAlert.name} — {t('map.considerSOS')}</p>
                                </div>
                            </div>
                            <a href="/user-dashboard" className="text-xs bg-risk-high text-white px-4 py-2 rounded-xl font-semibold hover:bg-red-600 transition">
                                {t('map.sendSOS')}
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 mb-5">
                {[
                    { id: 'dangerZone', label: t('map.dangerZone'), color: 'bg-risk-high' },
                    { id: 'userLocation', label: t('map.yourLocation'), color: 'bg-primary' },
                    { id: 'fire', label: t('map.fire'), color: 'bg-red-500' },
                    { id: 'police', label: t('map.police'), color: 'bg-blue-600' },
                    { id: 'hotel', label: t('map.hotel'), color: 'bg-orange-400' },
                    { id: 'food', label: t('map.food'), color: 'bg-emerald-500' },
                    { id: 'hospital', label: t('map.hospital'), color: 'bg-teal-500' },
                    { id: 'government', label: t('map.government'), color: 'bg-indigo-500' },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => toggleFilter(item.id)}
                        className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-all shadow-sm active:scale-95 ${filters[item.id]
                            ? 'bg-white text-dark border-gray-200 font-semibold'
                            : 'bg-gray-50 text-secondary border-gray-100 opacity-60 grayscale-[0.5]'
                            }`}
                    >
                        <span className={`w-2.5 h-2.5 rounded-full ${item.color} ${!filters[item.id] && 'opacity-30'}`} />
                        {item.label}
                    </button>
                ))}

                {/* Emergency Services Toggle */}
                <button
                    onClick={() => setShowEmergency(!showEmergency)}
                    className={`flex items-center gap-2 text-xs px-4 py-1 rounded-full border transition-all duration-300 shadow-sm ${showEmergency
                        ? 'bg-primary text-white border-primary border-2 font-bold scale-105'
                        : 'bg-white text-secondary border-gray-200'
                        }`}
                >
                    <span>{showEmergency ? '🚨' : '🏥'}</span>
                    {t('map.emergencyServices')}
                    {emergencyLoading && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block ml-1"></span>}
                </button>
            </div>

            <div className="rounded-2xl overflow-hidden border-2 border-gray-200 shadow-card" style={{ height: '500px' }}>
                <MapContainer center={[20.5937, 78.9629]} zoom={5} className="h-full w-full" style={{ background: '#F4F6FB' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {userPos && filters.userLocation && <FlyToUser position={userPos} />}

                    {userPos && filters.userLocation && (
                        <Marker position={userPos}>
                            <Popup>
                                <div className="text-dark text-sm">
                                    <p className="font-bold text-primary">📍 {t('map.yourLocation')}</p>
                                    <p>{userPos[0].toFixed(5)}, {userPos[1].toFixed(5)}</p>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    <EmergencyServicesLayer active={showEmergency} onLoading={setEmergencyLoading} filters={filters} />

                    {/* Resources Markers */}
                    {resources.map((res) => {
                        const typeMap = {
                            fire_station: 'fire',
                            police_station: 'police',
                            hotel: 'hotel',
                            food_point: 'food',
                            hospital: 'hospital',
                            government_office: 'government'
                        };
                        const filterKey = typeMap[res.type];
                        if (filterKey && !filters[filterKey]) return null;

                        let icon = L.divIcon({
                            html: `<div style="font-size: 24px;">${RESOURCE_ICONS[res.type] || '📍'}</div>`,
                            className: 'custom-resource-marker',
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                        });

                        if (res.type === 'police_station') icon = EMERGENCY_ICONS.police;
                        if (res.type === 'fire_station') icon = EMERGENCY_ICONS.fire;
                        if (res.type === 'hospital') {
                            icon = L.divIcon({
                                html: '<div style="background-color: #10B981; padding: 5px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);">🏥</div>',
                                className: 'custom-hospital-marker',
                                iconSize: [30, 30],
                                iconAnchor: [15, 15]
                            });
                        }
                        if (res.type === 'government_office') {
                            icon = L.divIcon({
                                html: '<div style="background-color: #6366F1; padding: 5px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);">🏛️</div>',
                                className: 'custom-government-marker',
                                iconSize: [30, 30],
                                iconAnchor: [15, 15]
                            });
                        }

                        return (
                            <Marker
                                key={res._id}
                                position={[res.location.coordinates[1], res.location.coordinates[0]]}
                                icon={icon}
                            >
                                <Popup>
                                    <div className="text-dark text-sm">
                                        <p className="font-bold border-bottom pb-1 mb-1">{res.name}</p>
                                        <p className="text-xs text-secondary mb-1">{res.address}</p>
                                        {res.type === 'food_point' && (
                                            <div className={`text-xs font-bold px-2 py-1 rounded-lg inline-block ${res.status.foodAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {t('common.foodAvailable')}: {res.status.foodAvailable ? `YES ✅` : `NO ❌`}
                                            </div>
                                        )}
                                        {res.contact && <p className="text-[10px] mt-1 text-primary">📞 {res.contact}</p>}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {filters.dangerZone && DISASTER_ZONES.map((zone, i) => (
                        <Polygon
                            key={i}
                            positions={zone.coords}
                            pathOptions={{
                                color: zone.color,
                                fillColor: zone.color,
                                fillOpacity: 0.25,
                                weight: 2.5
                            }}
                        >
                            <Popup>
                                <div className="text-dark text-sm">
                                    <p className="font-bold">{zone.name}</p>
                                    <p>{t('map.level')}: <span className="font-semibold" style={{ color: zone.color }}>{zone.level.toUpperCase()}</span></p>
                                </div>
                            </Popup>
                        </Polygon>
                    ))}
                </MapContainer>
            </div>
        </PageTransition>
    );
}
