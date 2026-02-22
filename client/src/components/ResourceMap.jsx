import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';

// Fix: Leaflet default icon paths break in Vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Create coloured circle markers for each resource type
function makeIcon(color, emoji) {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28">
            <path d="M12 1C6.48 1 2 5.48 2 11c0 7.5 10 16 10 16s10-8.5 10-16c0-5.52-4.48-10-10-10z" fill="${color}" stroke="white" stroke-width="1.5"/>
            <text x="12" y="14" text-anchor="middle" font-size="10">${emoji}</text>
        </svg>`;
    return L.divIcon({
        html: svg,
        className: '',
        iconSize: [24, 28],
        iconAnchor: [12, 28],
        popupAnchor: [0, -26],
    });
}

const ICONS = {
    food_point: makeIcon('#16a34a', '🍱'),
    fire_station: makeIcon('#dc2626', '🚒'),
    police_station: makeIcon('#1d4ed8', '👮'),
    hotel: makeIcon('#7c3aed', '🏨'),
    hospital: makeIcon('#0891b2', '🏥'),
    government_office: makeIcon('#b45309', '🏛️'),
    water_body: makeIcon('#0ea5e9', '💧'),
    rescue_center: makeIcon('#e11d48', '🆘'),
};

const TYPE_LABELS = {
    food_point: 'Food Point',
    fire_station: 'Fire Station',
    police_station: 'Police Station',
    hotel: 'Hotel / Shelter',
    hospital: 'Hospital',
    government_office: 'Government Office',
    water_body: 'Water Body',
    rescue_center: 'Rescue Center',
};

const TYPE_COLORS = {
    food_point: 'bg-green-100 text-green-700',
    fire_station: 'bg-red-100 text-red-700',
    police_station: 'bg-blue-100 text-blue-700',
    hotel: 'bg-purple-100 text-purple-700',
    hospital: 'bg-cyan-100 text-cyan-700',
    government_office: 'bg-amber-100 text-amber-700',
    water_body: 'bg-sky-100 text-sky-700',
    rescue_center: 'bg-rose-100 text-rose-700',
};

// Re-centre map when filter changes
function MapRecentre({ centre }) {
    const map = useMap();
    useEffect(() => {
        if (centre) map.setView(centre, map.getZoom());
    }, [centre, map]);
    return null;
}

export default function ResourceMap({ resources = [], onToggleFood }) {
    const { t } = useTranslation();
    const [filter, setFilter] = useState('all');
    const [selectedId, setSelectedId] = useState(null);

    const types = useMemo(() => {
        const seen = new Set(resources.map((r) => r.type));
        return ['all', ...Array.from(seen)];
    }, [resources]);

    const filtered = useMemo(() => {
        return filter === 'all'
            ? resources
            : resources.filter((r) => r.type === filter);
    }, [resources, filter]);

    // Default map center: centroid of all resources, or Coimbatore
    const centre = useMemo(() => {
        if (filtered.length === 0) return [11.0168, 76.9558];
        const lats = filtered.map((r) => r.location.coordinates[1]);
        const lons = filtered.map((r) => r.location.coordinates[0]);
        return [
            lats.reduce((a, b) => a + b, 0) / lats.length,
            lons.reduce((a, b) => a + b, 0) / lons.length,
        ];
    }, [filtered]);

    const foodPoints = resources.filter((r) => r.type === 'food_point');
    const availableFood = foodPoints.filter((r) => r.status?.foodAvailable).length;

    return (
        <div className="glass-card overflow-hidden group">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-indigo-100">
                        🗺️
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                            {t('adminDashboard.resourceMap') || 'Resource Map'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                {filtered.length} ACTIVE POINTS DETECTED
                            </p>
                        </div>
                    </div>
                </div>

                {/* Type filter pills */}
                <div className="flex flex-wrap gap-2">
                    {types.map((t) => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                                ${filter === t
                                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10 scale-105'
                                    : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200'
                                }`}
                        >
                            {t === 'all' ? 'All' : TYPE_LABELS[t] || t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Map */}
            <div className="h-[420px] relative">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <span className="text-4xl mb-2">📍</span>
                        <p className="text-sm font-medium">No resources to display</p>
                        <p className="text-xs mt-1">Try changing the filter above</p>
                    </div>
                ) : (
                    <MapContainer
                        center={centre}
                        zoom={12}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapRecentre centre={centre} />

                        {filtered.map((res) => {
                            const [lon, lat] = res.location.coordinates;
                            const icon = ICONS[res.type] || ICONS['food_point'];
                            const isFood = res.type === 'food_point';
                            const foodOk = res.status?.foodAvailable;

                            return (
                                <Marker
                                    key={res._id}
                                    position={[lat, lon]}
                                    icon={icon}
                                    eventHandlers={{ click: () => setSelectedId(res._id) }}
                                >
                                    <Popup minWidth={200}>
                                        <div className="font-sans text-sm">
                                            <p className="font-bold text-gray-800 mb-1">{res.name}</p>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[res.type] || 'bg-gray-100 text-gray-600'}`}>
                                                {TYPE_LABELS[res.type] || res.type}
                                            </span>

                                            {res.address && (
                                                <p className="text-xs text-gray-500 mt-2">📍 {res.address}</p>
                                            )}
                                            {res.contact && (
                                                <p className="text-xs text-gray-500 mt-1">📞 {res.contact}</p>
                                            )}

                                            {isFood && (
                                                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                                                    <span className={`text-xs font-bold ${foodOk ? 'text-green-600' : 'text-red-500'}`}>
                                                        {foodOk ? '✅ Food Available' : '❌ Food Unavailable'}
                                                    </span>
                                                    {onToggleFood && (
                                                        <button
                                                            onClick={() => onToggleFood(res._id, !foodOk)}
                                                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition ${foodOk
                                                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                }`}
                                                        >
                                                            {foodOk ? 'Mark Unavailable' : 'Mark Available'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            <p className="text-[10px] text-gray-400 mt-2">
                                                {lat.toFixed(5)}, {lon.toFixed(5)}
                                            </p>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                )}
            </div>

            {/* Legend */}
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-x-6 gap-y-2 relative z-10">
                {Object.entries(TYPE_LABELS).map(([type, label]) => {
                    const hasAny = resources.some((r) => r.type === type);
                    if (!hasAny) return null;
                    return (
                        <div key={type} className="flex items-center gap-2 group/legend">
                            <span className={`w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${TYPE_COLORS[type]?.split(' ')[0]} group-hover/legend:scale-125 transition-transform`} />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
