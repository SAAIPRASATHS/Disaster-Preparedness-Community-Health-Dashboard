import { useState, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, message, type, exiting: false }]);
        setTimeout(() => {
            setToasts((prev) =>
                prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
            );
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, 300);
        }, duration);
    }, []);

    const toast = {
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        info: (msg) => addToast(msg, 'info'),
        warning: (msg) => addToast(msg, 'warning'),
    };

    const COLORS = {
        success: 'bg-emerald-500/90',
        error: 'bg-rose-500/90',
        info: 'bg-primary/90',
        warning: 'bg-amber-500/90',
    };
    const ICONS = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-8 right-8 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`${t.exiting ? 'toast-exit' : 'toast-enter'} ${COLORS[t.type]} backdrop-blur-xl border border-white/20 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto max-w-sm`}
                    >
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-sm font-black shrink-0">
                            {ICONS[t.type]}
                        </div>
                        <span className="text-[12px] font-black uppercase tracking-widest">{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
