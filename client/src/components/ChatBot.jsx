import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../api';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';

const ChatBot = () => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [context, setContext] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch context when chatbot is opened
    useEffect(() => {
        if (isOpen && !context) {
            const fetchContext = async (lat, lon) => {
                try {
                    const [weather, aq, pollen] = await Promise.all([
                        API.get(`/weather?lat=${lat}&lon=${lon}`),
                        API.get(`/airquality?lat=${lat}&lon=${lon}`),
                        API.get(`/pollen?lat=${lat}&lon=${lon}`)
                    ]);
                    setContext({
                        location: weather.data.name,
                        lat: lat,
                        lon: lon,
                        weather: weather.data.current,
                        airQuality: {
                            aqi: aq.data.aqi,
                            level: aq.data.level,
                            advice: aq.data.advice
                        },
                        pollen: pollen.data.overall
                    });
                } catch (err) {
                    console.error('Failed to fetch chat context:', err);
                }
            };

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => fetchContext(pos.coords.latitude, pos.coords.longitude)
                );
            }
        }
    }, [isOpen]);

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
                context: {
                    ...context,
                    preferredLanguage: i18n.language === 'hi' ? 'Hindi' : i18n.language === 'ta' ? 'Tamil' : 'English'
                }
            });
            setMessages(prev => [...prev, data]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: t('chatbot.errorMessage')
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTranslate = async (msgIndex, text) => {
        try {
            const targetLang = i18n.language === 'hi' ? 'Hindi' : i18n.language === 'ta' ? 'Tamil' : 'English';
            const { data } = await API.post('/chat/translate', {
                text,
                targetLanguage: targetLang
            });

            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[msgIndex] = {
                    ...newMessages[msgIndex],
                    translatedContent: data.translatedText,
                    showOriginal: false
                };
                return newMessages;
            });
        } catch (error) {
            console.error('Translation error:', error);
        }
    };

    const toggleOriginal = (msgIndex) => {
        setMessages(prev => {
            const newMessages = [...prev];
            newMessages[msgIndex] = {
                ...newMessages[msgIndex],
                showOriginal: !newMessages[msgIndex].showOriginal
            };
            return newMessages;
        });
    };

    const handleClear = () => {
        setMessages([]);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="bg-white rounded-2xl shadow-2xl w-80 sm:w-96 overflow-hidden flex flex-col mb-4 border border-blue-100"
                        style={{ height: '500px' }}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm">
                                    🤖
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">{t('chatbot.title')}</h3>
                                    <p className="text-[10px] text-blue-200">{t('chatbot.poweredBy')}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={handleClear}
                                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
                                    title={t('chatbot.clearChat')}
                                >
                                    <svg xmlns="http://www.w3.org/2001/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                                <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white text-lg p-1">
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                            {messages.length === 0 && (
                                <div className="text-center text-gray-400 py-8 space-y-2">
                                    <p className="text-3xl">🤖</p>
                                    <p className="text-xs font-medium">{t('chatbot.greeting')}</p>
                                    <p className="text-[10px] text-gray-300">{t('chatbot.hint')}</p>
                                </div>
                            )}
                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed prose prose-sm hide-scrollbar ${m.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-sm'
                                        : 'bg-white text-gray-700 shadow-sm border border-gray-100 rounded-bl-sm'
                                        }`}>
                                        <ReactMarkdown
                                            components={{
                                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                                strong: ({ children }) => <span className="font-bold text-blue-800">{children}</span>,
                                                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{children}</a>
                                            }}
                                        >
                                            {m.showOriginal ? m.content : (m.translatedContent || m.content)}
                                        </ReactMarkdown>

                                        {m.role === 'assistant' && (
                                            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                                                <button
                                                    onClick={() => m.translatedContent ? toggleOriginal(i) : handleTranslate(i, m.content)}
                                                    className="text-[10px] text-blue-600 font-medium hover:underline flex items-center gap-1"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                                    </svg>
                                                    {m.translatedContent ? (m.showOriginal ? t('chatbot.showTranslated') : t('chatbot.showOriginal')) : t('chatbot.translate')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white text-gray-400 p-3 rounded-2xl shadow-sm border border-gray-100 text-sm">
                                        <span className="animate-pulse">{t('chatbot.thinking')}</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={t('chatbot.placeholder')}
                                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                            />
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
                            >
                                {t('common.send')}
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FAB */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl hover:shadow-xl transition-shadow"
            >
                {isOpen ? '✕' : '💬'}
            </motion.button>
        </div>
    );
};

export default ChatBot;
