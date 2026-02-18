import { motion } from 'framer-motion';

export function PageTransition({ children }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
        >
            {children}
        </motion.div>
    );
}

export function AnimatedCard({ children, delay = 0, className = '' }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay, ease: 'easeOut' }}
            whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(92,122,234,0.15)' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function Skeleton({ className = '', count = 1 }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className={`skeleton ${className}`} />
            ))}
        </>
    );
}

export function CardSkeleton() {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-card space-y-3">
            <div className="skeleton h-5 w-1/3" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-3 w-1/2 mt-2" />
        </div>
    );
}
