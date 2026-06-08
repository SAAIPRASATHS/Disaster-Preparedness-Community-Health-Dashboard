import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { PageTransition } from '../components/Motion';

const FALLBACK = { location: 'Coimbatore, Tamil Nadu', lat: 11.0168, lon: 76.9558, isFallback: true };
const LANGUAGES = [
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'hi', label: 'हिन्दी',  short: 'HI' },
    { code: 'ta', label: 'தமிழ்',  short: 'TA' },
];
const LANG_NAME = { en: 'English', hi: 'Hindi', ta: 'Tamil' };

// ── SVG Icons ──────────────────────────────────────────────────────────────
const IconSend = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
);
const IconTrash = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
);
const IconChevronLeft = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <polyline points="15 18 9 12 15 6"/>
    </svg>
);
const IconChevronDown = ({ open }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}>
        <polyline points="6 9 12 15 18 9"/>
    </svg>
);
const IconGlobe = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
);
const IconCheck = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
        <polyline points="20 6 9 17 4 12"/>
    </svg>
);
const IconPin = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
);
const IconBot = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 8V4"/><circle cx="12" cy="4" r="1"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="16" y1="13" x2="16" y2="15"/><line x1="9" y1="18" x2="15" y2="18"/>
    </svg>
);
const IconUser = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
);
const IconTranslate = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
        <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/>
    </svg>
);

export default function BotPage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [context, setContext] = useState(null);
    const [locationStatus, setLocationStatus] = useState('idle');
    const [translatingIdx, setTranslatingIdx] = useState(null);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const endRef = useRef(null);
    const langRef = useRef(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    useEffect(() => {
        const h = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setShowLangMenu(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const fetchContext = useCallback(async (lat, lon) => {
        try {
            const [w, a, p] = await Promise.all([
                API.get(`/weather?lat=${lat}&lon=${lon}`),
                API.get(`/airquality?lat=${lat}&lon=${lon}`),
                API.get(`/pollen?lat=${lat}&lon=${lon}`),
            ]);
            setContext({ location: w.data.name, lat, lon, weather: w.data.current, airQuality: { aqi: a.data.aqi, level: a.data.level }, pollen: p.data.overall, isFallback: false });
            setLocationStatus('success');
        } catch {
            setContext({ location: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, lat, lon, isFallback: false });
            setLocationStatus('success');
        }
    }, []);

    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) { setContext(FALLBACK); setLocationStatus('error'); return; }
        setLocationStatus('fetching');
        navigator.geolocation.getCurrentPosition(
            (p) => fetchContext(p.coords.latitude, p.coords.longitude),
            (e) => { setLocationStatus(e.code === 1 ? 'denied' : 'error'); setContext(FALLBACK); },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }, [fetchContext]);

    useEffect(() => { if (locationStatus === 'idle') requestLocation(); }, [locationStatus, requestLocation]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        const userMsg = { role: 'user', content: input };
        setMessages((p) => [...p, userMsg]);
        setInput('');
        setIsLoading(true);
        try {
            const { data } = await API.post('/chat', {
                messages: [...messages, userMsg],
                context: { ...(context || {}), preferredLanguage: LANG_NAME[i18n.language] || 'English' },
            });
            setMessages((p) => [...p, { ...data, translations: {} }]);
        } catch {
            setMessages((p) => [...p, { role: 'assistant', content: t('chatbot.errorMessage'), translations: {} }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTranslate = async (idx, langCode) => {
        const msg = messages[idx];
        if (msg.translations?.[langCode]) {
            setMessages((p) => { const n = [...p]; n[idx] = { ...n[idx], activeTranslation: langCode }; return n; });
            return;
        }
        setTranslatingIdx(idx);
        try {
            const { data } = await API.post('/chat/translate', { text: msg.content, targetLanguage: LANG_NAME[langCode] });
            setMessages((p) => {
                const n = [...p];
                n[idx] = { ...n[idx], translations: { ...(n[idx].translations || {}), [langCode]: data.translatedText }, activeTranslation: langCode };
                return n;
            });
        } catch {}
        finally { setTranslatingIdx(null); }
    };

    const showOriginal = (idx) => setMessages((p) => { const n = [...p]; n[idx] = { ...n[idx], activeTranslation: null }; return n; });
    const getContent = (m) => (m.activeTranslation && m.translations?.[m.activeTranslation]) ? m.translations[m.activeTranslation] : m.content;
    const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

    const chips = [t('botPage.chip1'), t('botPage.chip2'), t('botPage.chip3'), t('botPage.chip4')];

    return (
        <PageTransition>
            <div style={{ height: 'calc(100vh - 7rem)' }} className="flex flex-col md:px-0">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col overflow-hidden rounded-2xl border border-white/30 shadow-2xl"
                    style={{ height: '100%', maxWidth: '860px', margin: '0 auto', width: '100%', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}
                >
                    {/* ── HEADER ── */}
                    <div className="flex-shrink-0 flex items-center justify-between px-4 md:px-5 py-3 md:py-3.5 border-b border-slate-100" style={{ background: '#0f172a' }}>
                        {/* Left */}
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                                <IconChevronLeft />
                            </button>
                            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
                                <IconBot />
                            </div>
                            <div>
                                <div className="text-white font-bold text-sm leading-tight">{t('chatbot.title')}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                    <span className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold">{t('chatbot.poweredBy')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right controls */}
                        <div className="flex items-center gap-2">
                            {/* Location */}
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                                <IconPin />
                                <span className="text-[10px] font-semibold text-slate-300 max-w-[140px] truncate">
                                    {locationStatus === 'fetching' ? t('botPage.detectingLocation')
                                        : locationStatus === 'success' && context?.location ? context.location
                                        : locationStatus === 'denied' ? t('botPage.locationDenied')
                                        : 'Coimbatore (default)'}
                                </span>
                            </div>

                            {/* Lang switcher */}
                            <div className="relative" ref={langRef}>
                                <button
                                    onClick={() => setShowLangMenu((v) => !v)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
                                >
                                    <IconGlobe />
                                    <span className="text-[11px] font-bold uppercase tracking-wider">{currentLang.short}</span>
                                    <IconChevronDown open={showLangMenu} />
                                </button>
                                <AnimatePresence>
                                    {showLangMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -6, scale: 0.96 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-0 top-full mt-2 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[160px] border border-slate-700"
                                            style={{ background: '#1e293b' }}
                                        >
                                            {LANGUAGES.map((lang) => (
                                                <button
                                                    key={lang.code}
                                                    onClick={() => { i18n.changeLanguage(lang.code); setShowLangMenu(false); }}
                                                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors text-left ${i18n.language === lang.code ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/10'}`}
                                                >
                                                    <div>
                                                        <div className="font-semibold text-sm">{lang.label}</div>
                                                        <div className="text-[10px] opacity-60 font-normal">{lang.short}</div>
                                                    </div>
                                                    {i18n.language === lang.code && <IconCheck />}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Clear */}
                            <button
                                onClick={() => setMessages([])}
                                title={t('chatbot.clearChat')}
                                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                                <IconTrash />
                            </button>
                        </div>
                    </div>

                    {/* Responding in bar */}
                    <div className="flex-shrink-0 flex items-center justify-between px-4 md:px-5 py-1.5 bg-indigo-600/5 border-b border-indigo-100">
                        <span className="text-[10px] text-indigo-500 font-semibold uppercase tracking-widest">{t('botPage.respondingIn')}: <strong>{currentLang.label}</strong></span>
                        {context?.isFallback && (
                            <button onClick={requestLocation} className="text-[10px] text-amber-600 font-semibold hover:underline">
                                {t('botPage.enablePrecision')} →
                            </button>
                        )}
                    </div>

                    {/* ── MESSAGES ── */}
                    <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4 md:py-6 space-y-4 md:space-y-5" style={{ background: '#f8fafc' }}>
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-5 py-10">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                                        <rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 8V4"/><circle cx="12" cy="4" r="1"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="16" y1="13" x2="16" y2="15"/><line x1="9" y1="18" x2="15" y2="18"/>
                                    </svg>
                                </div>
                                <div className="max-w-sm">
                                    <h2 className="text-lg font-bold text-slate-800 mb-1">{t('chatbot.greeting')}</h2>
                                    <p className="text-sm text-slate-500 leading-relaxed">{t('chatbot.hint')}</p>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {chips.map((chip, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setInput(chip)}
                                            className="px-4 py-2 rounded-full border border-indigo-200 bg-white text-indigo-600 text-xs font-semibold hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm"
                                        >
                                            {chip}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((m, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {m.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow">
                                        <IconBot />
                                    </div>
                                )}

                                <div className="flex flex-col gap-2 max-w-[76%]">
                                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                        m.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-500/20'
                                            : 'bg-white text-slate-700 rounded-tl-none shadow-sm border border-slate-100'
                                    }`}>
                                        <ReactMarkdown
                                            components={{
                                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
                                                strong: ({ children }) => <strong className={`font-bold ${m.role === 'user' ? 'text-white' : 'text-slate-900'}`}>{children}</strong>,
                                                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline">{children}</a>,
                                            }}
                                        >
                                            {getContent(m)}
                                        </ReactMarkdown>
                                    </div>

                                    {/* Translate toolbar */}
                                    {m.role === 'assistant' && (
                                        <div className="flex items-center gap-1.5 flex-wrap pl-1">
                                            <IconTranslate />
                                            {m.activeTranslation && (
                                                <button onClick={() => showOriginal(i)} className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                                                    Original
                                                </button>
                                            )}
                                            {LANGUAGES.map((lang) => {
                                                const isActive = m.activeTranslation === lang.code;
                                                const isCurrent = lang.code === i18n.language && !m.activeTranslation;
                                                if (isCurrent) return null;
                                                return (
                                                    <button
                                                        key={lang.code}
                                                        onClick={() => handleTranslate(i, lang.code)}
                                                        disabled={translatingIdx === i}
                                                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 ${
                                                            isActive ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                                        }`}
                                                    >
                                                        {translatingIdx === i && !m.translations?.[lang.code] ? '...' : lang.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {m.role === 'user' && (
                                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0 mt-0.5">
                                        <IconUser />
                                    </div>
                                )}
                            </motion.div>
                        ))}

                        {isLoading && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 justify-start">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                                    <IconBot />
                                </div>
                                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5 shadow-sm">
                                    <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                                    <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.15s]" />
                                    <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.3s]" />
                                    <span className="text-xs text-slate-400 ml-1 font-medium">{t('chatbot.thinking')}</span>
                                </div>
                            </motion.div>
                        )}
                        <div ref={endRef} />
                    </div>

                    {/* ── INPUT ── */}
                    <div className="flex-shrink-0 border-t border-slate-100 bg-white px-4 md:px-5 py-3 md:py-4 pb-safe">
                        <form onSubmit={handleSend} className="flex gap-2 md:gap-3 items-center max-w-3xl mx-auto">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={t('chatbot.placeholder')}
                                autoFocus
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="flex items-center justify-center gap-1.5 md:gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 md:px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 active:scale-95"
                            >
                                <span className="hidden sm:inline">{t('common.send')}</span>
                                <IconSend />
                            </button>
                        </form>
                        <p className="text-center text-[10px] text-slate-400 mt-2.5 font-medium">{t('botPage.disclaimer')}</p>
                    </div>
                </motion.div>
            </div>
        </PageTransition>
    );
}
