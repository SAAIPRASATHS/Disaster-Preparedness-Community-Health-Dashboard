import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../api';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';

// Coimbatore fallback coordinates (used if geolocation is denied/fails)
const FALLBACK_CONTEXT = {
    location: 'Coimbatore, Tamil Nadu',
    lat: 11.0168,
    lon: 76.9558,
    isFallback: true,
};

const ChatBot = () => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [context, setContext] = useState(null);
    // 'idle' | 'fetching' | 'success' | 'denied' | 'error'
    const [locationStatus, setLocationStatus] = useState('idle');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchContext = useCallback(async (lat, lon) => {
        try {
            const [weather, aq, pollen] = await Promise.all([
                API.get(`/weather?lat=${lat}&lon=${lon}`),
                API.get(`/airquality?lat=${lat}&lon=${lon}`),
                API.get(`/pollen?lat=${lat}&lon=${lon}`),
            ]);
            setContext({
                location: weather.data.name,
                lat,
                lon,
                weather: weather.data.current,
                airQuality: {
                    aqi: aq.data.aqi,
                    level: aq.data.level,
                    advice: aq.data.advice,
                },
                pollen: pollen.data.overall,
                isFallback: false,
            });
            setLocationStatus('success');
        } catch (err) {
            console.error('Failed to fetch chat context:', err);
            // Even if enrichment APIs fail, we have the coordinates
            setContext({ location: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, lat, lon, isFallback: false });
            setLocationStatus('success');
        }
    }, []);

    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            // Browser doesn't support geolocation — use fallback
            setContext(FALLBACK_CONTEXT);
            setLocationStatus('error');
            return;
        }

        setLocationStatus('fetching');

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                fetchContext(pos.coords.latitude, pos.coords.longitude);
            },
            (err) => {
                console.warn('Geolocation error:', err.message);
                if (err.code === 1 /* PERMISSION_DENIED */) {
                    setLocationStatus('denied');
                } else {
                    setLocationStatus('error');
                }
                // Always set a fallback so the AI still has some context
                setContext(FALLBACK_CONTEXT);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }, [fetchContext]);

    // Auto-request location when chatbot first opens
    useEffect(() => {
        if (isOpen && locationStatus === 'idle') {
            requestLocation();
        }
    }, [isOpen, locationStatus, requestLocation]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages([...messages, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const { data } = await API.post('/chat', {
                messages: [...messages, userMessage],
                context: context
                    ? {
                        ...context,
                        preferredLanguage:
                            i18n.language === 'hi'
                                ? 'Hindi'
                                : i18n.language === 'ta'
                                    ? 'Tamil'
                                    : 'English',
                    }
                    : null,
            });
            setMessages((prev) => [...prev, data]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: t('chatbot.errorMessage') },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTranslate = async (msgIndex, text) => {
        try {
            const targetLang =
                i18n.language === 'hi' ? 'Hindi' : i18n.language === 'ta' ? 'Tamil' : 'English';
            const { data } = await API.post('/chat/translate', { text, targetLanguage: targetLang });
            setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[msgIndex] = {
                    ...newMessages[msgIndex],
                    translatedContent: data.translatedText,
                    showOriginal: false,
                };
                return newMessages;
            });
        } catch (error) {
            console.error('Translation error:', error);
        }
    };

    const toggleOriginal = (msgIndex) => {
        setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[msgIndex] = {
                ...newMessages[msgIndex],
                showOriginal: !newMessages[msgIndex].showOriginal,
            };
            return newMessages;
        });
    };

    const handleClear = () => setMessages([]);

    // Location status badge content
    const LocationBadge = () => {
        if (locationStatus === 'fetching') {
            return (
                <span className="flex items-center gap-1 text-[10px] text-blue-200 animate-pulse">
                    <span>🔵</span> Detecting location…
                </span>
            );
        }
        if (locationStatus === 'success' && context?.location) {
            return (
                <span className="flex items-center gap-1 text-[10px] text-green-300">
                    <span>📍</span>
                    <span className="truncate max-w-[140px]">{context.location}</span>
                </span>
            );
        }
        if (locationStatus === 'denied') {
            return (
                <span className="flex items-center gap-1 text-[10px] text-red-300">
                    <span>🔴</span> Location denied —{' '}
                    <button
                        onClick={requestLocation}
                        className="underline hover:text-white"
                    >
                        Retry
                    </button>
                </span>
            );
        }
        if (locationStatus === 'error') {
            return (
                <span className="flex items-center gap-1 text-[10px] text-yellow-300">
                    <span>⚠️</span> Using Coimbatore (fallback) —{' '}
                    <button
                        onClick={requestLocation}
                        className="underline hover:text-white"
                    >
                        Retry
                    </button>
                </span>
            );
        }
        return null;
    };

    return (
        <div className="fixed bottom-8 right-8 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="glass-card w-80 sm:w-[400px] overflow-hidden flex flex-col mb-6 relative"
                        style={{ height: '600px', backdropFilter: 'blur(20px)' }}
                    >
                        {/* Background Accents */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />

                        {/* Header */}
                        <div className="bg-slate-900 px-6 py-5 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />

                            <div className="flex justify-between items-center relative z-10">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white/10">
                                        🤖
                                    </div>
                                    <div>
                                        <h3 className="font-black text-sm tracking-tight uppercase">{t('chatbot.title')}</h3>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('chatbot.poweredBy')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={handleClear}
                                        className="p-2 hover:bg-white/10 rounded-xl transition-all text-white/60 hover:text-white"
                                        title={t('chatbot.clearChat')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="text-white/40 hover:text-white transition-colors p-1"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Location Status Badge */}
                            <div className="mt-4 flex items-center justify-between">
                                <LocationBadge />
                            </div>
                        </div>

                        {/* Fallback notice */}
                        {context?.isFallback && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 text-[9px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-3"
                            >
                                <span className="w-5 h-5 rounded-lg bg-amber-500/10 flex items-center justify-center">!</span>
                                <span className="flex-1">
                                    Defaulting to <strong>Coimbatore</strong>.{' '}
                                    <button
                                        onClick={requestLocation}
                                        className="underline ml-1 hover:text-amber-700"
                                    >
                                        Enable Precision
                                    </button>
                                </span>
                            </motion.div>
                        )}

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center px-8 space-y-6">
                                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-4xl shadow-inner border border-slate-100">
                                        🤖
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-2">{t('chatbot.greeting')}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] leading-relaxed">{t('chatbot.hint')}</p>
                                    </div>
                                </div>
                            )}
                            {messages.map((m, i) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={i}
                                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] p-4 rounded-2xl text-[13px] leading-relaxed prose prose-sm ${m.role === 'user'
                                            ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/20 font-medium'
                                            : 'bg-white/80 text-slate-700 shadow-sm border border-slate-100 rounded-tl-none backdrop-blur-md'
                                            }`}
                                    >
                                        <ReactMarkdown
                                            components={{
                                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
                                                strong: ({ children }) => <span className="font-black text-slate-900">{children}</span>,
                                                a: ({ href, children }) => (
                                                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline">
                                                        {children}
                                                    </a>
                                                ),
                                            }}
                                        >
                                            {m.showOriginal ? m.content : m.translatedContent || m.content}
                                        </ReactMarkdown>

                                        {m.role === 'assistant' && (
                                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                                <button
                                                    onClick={() =>
                                                        m.translatedContent
                                                            ? toggleOriginal(i)
                                                            : handleTranslate(i, m.content)
                                                    }
                                                    className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/70 flex items-center gap-2 transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                                    </svg>
                                                    {m.translatedContent
                                                        ? m.showOriginal
                                                            ? t('chatbot.showTranslated')
                                                            : t('chatbot.showOriginal')
                                                        : t('chatbot.translate')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex justify-start"
                                >
                                    <div className="bg-white/50 backdrop-blur-sm text-slate-400 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100">
                            <form onSubmit={handleSend} className="flex gap-3 relative items-center">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={t('chatbot.placeholder')}
                                    className="premium-input w-full pr-24 py-3.5 text-xs font-medium"
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim()}
                                    className="absolute right-2 top-1.5 bottom-1.5 bg-primary text-white px-5 rounded-xl hover:bg-primary/90 disabled:opacity-0 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20 active:scale-95"
                                >
                                    {t('common.send')}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FAB */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="bg-slate-900 text-white w-16 h-16 rounded-[2rem] shadow-2xl flex items-center justify-center text-3xl hover:shadow-primary/25 transition-all group relative border-4 border-white"
            >
                <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity rounded-[2rem]" />
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    '💬'
                )}
            </motion.button>
        </div>
    );
};

export default ChatBot;
