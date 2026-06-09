import { useState, useEffect } from 'react';
import { PageTransition, AnimatedCard } from '../components/Motion';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

const SEVERITY = {
    CRITICAL: { bg: 'bg-red-50', badge: 'bg-red-600 text-white', icon: '🚨', shadow: 'shadow-red-500/20' },
    HIGH: { bg: 'bg-rose-50', badge: 'bg-rose-500 text-white', icon: '🔴', shadow: 'shadow-rose-500/20' },
    MEDIUM: { bg: 'bg-amber-50', badge: 'bg-amber-500 text-white', icon: '🟡', shadow: 'shadow-amber-500/10' },
    LOW: { bg: 'bg-emerald-50', badge: 'bg-emerald-500 text-white', icon: '🟢', shadow: 'shadow-emerald-500/10' },
};

const ICONS = {
    'Flood': '🌊', 'Cyclone': '🌀', 'Earthquake': '🌍', 'Tsunami': '🌊',
    'Fire': '🔥', 'Heavy Rain': '🌧', 'Heat Wave': '☀', 'Health Emergency': '🏥',
    'default': '⚠️'
};

export default function Alerts() {
    const { t, i18n } = useTranslation();
    const [alerts, setAlerts] = useState([]);
    const [stats, setStats] = useState(null);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    try {
                        const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
                        const district = res.data.address?.state_district || res.data.address?.county || res.data.address?.city;
                        if (district) setUserLocation(district.replace(' District', ''));
                    } catch (e) { console.error('Geocoding failed'); }
                },
                () => {},
                { enableHighAccuracy: true }
            );
        }

        fetchAlerts();
        fetchStats();

        const socket = io(SOCKET_URL);
        socket.on('disaster-alert', (newAlert) => {
            setAlerts(prev => {
                if (prev.find(a => a.id === newAlert.id || a.externalId === newAlert.externalId)) return prev;
                return [newAlert, ...prev];
            });
            setLastUpdated(new Date());
            fetchStats();
        });

        return () => socket.disconnect();
    }, []);

    const fetchAlerts = async () => {
        try {
            const { data } = await axios.get(`${API}/live-alert?status=ACTIVE`);
            setAlerts(data);
        } catch (error) { console.error('Fetch alerts failed', error); }
        finally { setLoading(false); setLastUpdated(new Date()); }
    };

    const fetchStats = async () => {
        try {
            const { data } = await axios.get(`${API}/live-alert/stats`);
            setStats(data);
        } catch (error) { }
    };

    let filteredAlerts = alerts;
    if (filter === 'local' && userLocation) {
        filteredAlerts = alerts.filter(a => a.district?.toLowerCase().includes(userLocation.toLowerCase()));
    } else if (filter !== 'all') {
        filteredAlerts = alerts.filter(a => a.severity === filter);
    }

    const officialAlerts = filteredAlerts.filter(a => !a.isAi);

    const renderTitle = (alert) => {
        if (i18n.language === 'ta' && alert.title_ta) return alert.title_ta;
        if (i18n.language === 'hi' && alert.title_hi) return alert.title_hi;
        return tr(alert.title);
    };

    const renderDescription = (alert) => {
        if (i18n.language === 'ta' && alert.description_ta) return alert.description_ta;
        if (i18n.language === 'hi' && alert.description_hi) return alert.description_hi;
        return tr(alert.description);
    };

    // Dynamic translation helper for APIs that return English
    const tr = (text) => {
        if (i18n.language === 'ta') {
            const dictTa = {
                'Flood': 'வெள்ளம்', 'Cyclone': 'சூறாவளி', 'Earthquake': 'பூகம்பம்', 'Heavy Rain': 'கனமழை', 'Tsunami': 'சுனாமி',
                'CRITICAL': 'மிகத்தீவிரமான', 'HIGH': 'உயர்ந்த', 'MEDIUM': 'மத்திமம்', 'LOW': 'குறைந்த',
                'Kancheepuram': 'காஞ்சிபுரம்', 'Cuddalore': 'கடலூர்', 'Nagapattinam': 'நாகப்பட்டினம்', 'Chennai': 'சென்னை',
                'Coastal / Affected Area': 'கடலோர / பாதிக்கப்பட்ட பகுதி', 'Tamil Nadu': 'தமிழ்நாடு',
                'DISASTERPREP AI ENGINE': 'பேரிடர் தயார்நிலை AI இயந்திரம்',
                'INCOIS (INDIAN NATIONAL CENTRE FOR OCEAN INFORMATION SERVICES)': 'INCOIS (பெருங்கடல் தகவல் சேவைகளுக்கான இந்திய தேசிய மையம்)',
                'IMD (INDIA METEOROLOGICAL DEPARTMENT)': 'IMD (இந்திய வானிலை ஆய்வு மையம்)',
                'AI Prediction': 'AI கணிப்பு', 'Risk': 'அபாயம்', 'Confidence': 'உறுதி',
                'AI Risk Prediction: Flood Risk Elevated in Chennai': 'AI அபாய கணிப்பு: சென்னையில் வெள்ள அபாயம் அதிகரித்துள்ளது',
                'Rainfall intensity (187mm/24h) combined with rising river levels and soil saturation index of 0.91 indicates HIGH flood risk within 12 hours. Risk Score: 82/100. Confidence: 68%.': 'மழையின் தீவிரம் (187mm/24h), நதி நீர்மட்டம் அதிகரிப்பு மற்றும் மண் செறிவூட்டல் குறியீடு 0.91 ஆகியவை அடுத்த 12 மணி நேரத்திற்குள் உயர் வெள்ள அபாயத்தைக் குறிக்கின்றன. அபாய மதிப்பெண்: 82/100. உறுதி: 68%.',
                'INCOIS Tsunami Watch: Coastal Areas on Alert': 'INCOIS சுனாமி கண்காணிப்பு: கடலோர பகுதிகள் எச்சரிக்கை',
                'INCOIS has issued a Tsunami Watch following a 7.2 magnitude undersea earthquake. Coastal communities in Tamil Nadu advised to move to higher ground immediately.': '7.2 ரிக்டர் அளவிலான நிலநடுக்கத்தைத் தொடர்ந்து INCOIS சுனாமி கண்காணிப்பை வெளியிட்டுள்ளது. தமிழ்நாட்டின் கடலோர சமூகங்கள் உடனடியாக உயரமான இடங்களுக்கு செல்ல அறிவுறுத்தப்படுகிறார்கள்.',
                'Cyclone Probability Elevated': 'சூறாவளிக்கான வாய்ப்பு அதிகரித்துள்ளது',
                'DisasterPrep AI indicates a 68% probability of cyclonic formation in the Bay of Bengal affecting Chennai coast within 72 hours based on wind shear data.': 'காற்று வெட்டு தரவுகளின் அடிப்படையில் 72 மணி நேரத்திற்குள் சென்னை கடற்கரையை பாதிக்கும் வங்காள விரிகுடாவில் சூறாவளி உருவாவதற்கான 68% நிகழ்தகவை DisasterPrep AI குறிக்கிறது.',
                'Flash Flood Risk Detected': 'திடீர் வெள்ள அபாயம் கண்டறியப்பட்டுள்ளது',
                'AI analysis of current soil saturation and upcoming IMD rainfall forecasts suggest a high risk of localized flooding in low-lying areas of Tirunelveli.': 'தற்போதைய மண் செறிவூட்டல் மற்றும் வரவிருக்கும் IMD மழை முன்னறிவிப்புகளின் AI பகுப்பாய்வு திருநெல்வேலியின் தாழ்வான பகுதிகளில் உள்ளூர் வெள்ள அபாயத்தை பரிந்துரைக்கிறது.'
            };
            return dictTa[text] || text;
        }
        if (i18n.language === 'hi') {
            const dictHi = {
                'Flood': 'बाढ़', 'Cyclone': 'चक्रवात', 'Earthquake': 'भूकंप', 'Heavy Rain': 'भारी वर्षा', 'Tsunami': 'सुनामी',
                'CRITICAL': 'गंभीर', 'HIGH': 'उच्च', 'MEDIUM': 'मध्यम', 'LOW': 'कम',
                'Kancheepuram': 'कांचीपुरम', 'Cuddalore': 'कुड्डालोर', 'Nagapattinam': 'नागपट्टिनम', 'Chennai': 'चेन्नई',
                'Coastal / Affected Area': 'तटीय / प्रभावित क्षेत्र', 'Tamil Nadu': 'तमिलनाडु',
                'DISASTERPREP AI ENGINE': 'आपदा तैयारी AI इंजन',
                'INCOIS (INDIAN NATIONAL CENTRE FOR OCEAN INFORMATION SERVICES)': 'INCOIS (महासागर सूचना सेवाओं के लिए भारतीय राष्ट्रीय केंद्र)',
                'IMD (INDIA METEOROLOGICAL DEPARTMENT)': 'IMD (भारत मौसम विज्ञान विभाग)',
                'AI Prediction': 'AI भविष्यवाणी', 'Risk': 'जोखिम', 'Confidence': 'विश्वास',
                'AI Risk Prediction: Flood Risk Elevated in Chennai': 'AI जोखिम भविष्यवाणी: चेन्नई में बाढ़ का खतरा बढ़ गया है',
                'Rainfall intensity (187mm/24h) combined with rising river levels and soil saturation index of 0.91 indicates HIGH flood risk within 12 hours. Risk Score: 82/100. Confidence: 68%.': 'वर्षा की तीव्रता (187mm/24h) के साथ-साथ नदी के जल स्तर में वृद्धि और 0.91 मृदा संतृप्ति सूचकांक अगले 12 घंटों के भीतर उच्च बाढ़ के जोखिम का संकेत देते हैं। जोखिम स्कोर: 82/100। विश्वास: 68%।',
                'INCOIS Tsunami Watch: Coastal Areas on Alert': 'INCOIS सुनामी निगरानी: तटीय क्षेत्र अलर्ट पर',
                'INCOIS has issued a Tsunami Watch following a 7.2 magnitude undersea earthquake. Coastal communities in Tamil Nadu advised to move to higher ground immediately.': '7.2 तीव्रता के भूकंप के बाद INCOIS ने सुनामी निगरानी जारी की है। तमिलनाडु में तटीय समुदायों को तुरंत ऊंचे स्थानों पर जाने की सलाह दी जाती है।',
                'Cyclone Probability Elevated': 'चक्रवात की संभावना बढ़ गई',
                'DisasterPrep AI indicates a 68% probability of cyclonic formation in the Bay of Bengal affecting Chennai coast within 72 hours based on wind shear data.': 'पवन कतरनी डेटा के आधार पर 72 घंटों के भीतर चेन्नई तट को प्रभावित करने वाली बंगाल की खाड़ी में चक्रवाती गठन की 68% संभावना को डिजास्टरप्रेप AI इंगित करता है।',
                'Flash Flood Risk Detected': 'अचानक बाढ़ का जोखिम पाया गया',
                'AI analysis of current soil saturation and upcoming IMD rainfall forecasts suggest a high risk of localized flooding in low-lying areas of Tirunelveli.': 'वर्तमान मृदा संतृप्ति और आगामी IMD वर्षा पूर्वानुमानों का AI विश्लेषण तिरुनेलवेली के निचले इलाकों में स्थानीय बाढ़ के उच्च जोखिम का सुझाव देता है।'
            };
            return dictHi[text] || text;
        }
        return text;
    };

    return (
        <PageTransition>
            <div className="max-w-6xl mx-auto pt-6 pb-20 px-4 md:px-0">
                <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
                    <div>
                        <motion.h1 
                            initial={{ opacity: 0, y: -10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight flex items-center gap-4"
                        >
                            <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-xl shadow-red-500/20">📡</span>
                            {t('alerts.title1')} {t('alerts.title2')}
                        </motion.h1>
                        <p className="text-slate-500 font-medium mt-2 max-w-lg">
                            {t('alerts.subtitle')}
                        </p>
                    </div>
                    
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-3 px-5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-full shadow-sm mb-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <span className="text-[11px] font-black text-emerald-800 uppercase tracking-widest">{t('alerts.liveSync')}</span>
                        </div>
                        {userLocation && <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-1">📍 {t('alerts.detectingFor')} {userLocation}</p>}
                    </div>
                </div>

                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="glass-card p-5 border-l-4 border-l-primary">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('alerts.officialActive')}</p>
                            <p className="text-4xl font-black text-slate-800">{stats.activeCount}</p>
                        </div>
                        <div className="glass-card p-5 border-l-4 border-l-red-500 bg-red-50/30">
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">{t('alerts.criticalHighRisk')}</p>
                            <p className="text-4xl font-black text-red-600">
                                {(stats.bySeverity.find(s => s.severity === 'CRITICAL')?.count || 0) + (stats.bySeverity.find(s => s.severity === 'HIGH')?.count || 0)}
                            </p>
                        </div>
                        <div className="glass-card p-5 md:col-span-2 overflow-hidden flex items-center">
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('alerts.topAffected')}</p>
                                <div className="flex flex-wrap gap-2">
                                    {stats.byDistrict.slice(0, 4).map(d => (
                                        <span key={d.district} className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-black text-slate-600 flex items-center gap-2">
                                            {d.district} <span className="bg-slate-200 px-2 rounded-md text-[10px]">{d.count}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="sticky top-20 z-40 bg-white/80 backdrop-blur-xl py-4 mb-8 border-b border-slate-100 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2 min-w-max">
                        {userLocation && (
                            <button
                                onClick={() => setFilter('local')}
                                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 ${filter === 'local'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                    : 'bg-white text-indigo-600 border-indigo-100 hover:bg-slate-50'}`}
                            >
                                📍 {t('alerts.myDistrict')}
                            </button>
                        )}
                        {['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 ${filter === f
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                    : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'}`}
                            >
                                {f === 'all' ? t('alerts.allAlerts') : tr(f)}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-4 border-slate-200 border-t-primary rounded-full" /></div>
                ) : (
                    <>
                        <div className="mb-16">
                            <div className="flex items-center gap-3 mb-6">
                                <h2 className="text-xl font-black uppercase tracking-widest text-slate-800">{t('alerts.sectionA')}</h2>
                                <div className="h-px flex-1 bg-slate-200"></div>
                            </div>

                            {officialAlerts.length === 0 ? (
                                <div className="glass-card p-16 text-center rounded-[2rem] border-dashed border-2 border-slate-200">
                                    <div className="text-5xl mb-4 opacity-20">✅</div>
                                    <h3 className="text-lg font-black text-slate-700 uppercase tracking-widest mb-2">{t('alerts.noActiveDisaster')}</h3>
                                    <p className="text-sm font-medium text-slate-400 mb-6">{t('alerts.lastChecked')}: {lastUpdated.toLocaleTimeString()}</p>
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{t('alerts.monitoring')} IMD | CWC | NCS | INCOIS | NDMA | MOHFW | USGS | GDACS</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <AnimatePresence>
                                        {officialAlerts.map((alert, i) => {
                                            const s = SEVERITY[alert.severity] || SEVERITY.MEDIUM;
                                            const icon = ICONS[alert.disasterType] || ICONS.default;

                                            return (
                                                <AnimatedCard key={alert.id} delay={i * 0.05} className={`bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 ${s.shadow} relative overflow-hidden group`}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center text-2xl`}>{icon}</div>
                                                            <div>
                                                                <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1 ${s.badge}`}>🚨 {t('alerts.officialAlertBadge')} · {tr(alert.severity)}</span>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tr(alert.disasterType)}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs font-black text-slate-900 uppercase">{tr(alert.district)}</p>
                                                            <p className="text-[10px] font-bold text-slate-700 max-w-[150px] truncate" title={tr(alert.source)}>{tr(alert.source)}</p>
                                                        </div>
                                                    </div>

                                                    <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight mb-2">{renderTitle(alert)}</h3>
                                                    <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6">{renderDescription(alert)}</p>
                                                    
                                                    <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-xl">
                                                        <div>
                                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{t('alerts.issuedTime')}</p>
                                                            <p className="text-[10px] font-bold text-slate-700">{new Date(alert.issuedAt).toLocaleString()}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{t('alerts.officialSource')}</p>
                                                            <p className="text-[10px] font-black text-primary uppercase tracking-wider">{tr(alert.source)}</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        {alert.referenceLink && (
                                                            <a href={alert.referenceLink} target="_blank" rel="noreferrer" className="sm:col-span-2 flex items-center justify-center py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                                                                🌐 {t('alerts.openSource')}
                                                            </a>
                                                        )}
                                                        {['CRITICAL', 'HIGH'].includes(alert.severity) && (
                                                            <>
                                                                <a href="tel:112" className="flex items-center justify-center py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">📞 112</a>
                                                                <a href="/map" className="flex items-center justify-center py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">🏥 {t('map.hospital')}</a>
                                                            </>
                                                        )}
                                                        {!['CRITICAL', 'HIGH'].includes(alert.severity) && !alert.referenceLink && (
                                                            <button className="sm:col-span-2 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">{t('alerts.viewProtocol')}</button>
                                                        )}
                                                    </div>
                                                </AnimatedCard>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </PageTransition>
    );
}
