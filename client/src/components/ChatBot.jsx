import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../api';

const ChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages([...messages, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const { data } = await API.post('/chat', { messages: [...messages, userMessage] });
            setMessages(prev => [...prev, data]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I am having trouble connecting. Please check if the GROQ_API_KEY is configured on the server.'
            }]);
        } finally {
            setIsLoading(false);
        }
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
                                    <h3 className="font-bold text-sm">Health & Disaster Bot</h3>
                                    <p className="text-[10px] text-blue-200">Powered by Groq AI</p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white text-lg">
                                ✕
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                            {messages.length === 0 && (
                                <div className="text-center text-gray-400 py-8 space-y-2">
                                    <p className="text-3xl">🤖</p>
                                    <p className="text-xs font-medium">Hello! I'm your disaster preparedness & community health assistant.</p>
                                    <p className="text-[10px] text-gray-300">Ask about emergency procedures, risk assessment, air quality, or health tips.</p>
                                </div>
                            )}
                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${m.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-br-sm'
                                            : 'bg-white text-gray-700 shadow-sm border border-gray-100 rounded-bl-sm'
                                        }`}>
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white text-gray-400 p-3 rounded-2xl shadow-sm border border-gray-100 text-sm">
                                        <span className="animate-pulse">Thinking...</span>
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
                                placeholder="Ask me anything..."
                                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                            />
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
                            >
                                Send
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
