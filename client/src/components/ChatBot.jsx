import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ChatBot = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <div className="fixed bottom-8 right-8 z-50">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/bot')}
                className="bg-indigo-600 text-white w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center hover:bg-indigo-700 transition-all relative border-2 border-indigo-400/30"
                title={t('chatbot.title')}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
            </motion.button>
            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white" />
        </div>
    );
};

export default ChatBot;
