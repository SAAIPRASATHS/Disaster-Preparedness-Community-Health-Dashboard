/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                primary: '#2563EB',
                secondary: '#64748B',
                accent: '#DBEAFE',
                warning: '#F59E0B',
                danger: '#EF4444',
                emergency: '#FE7F2D',
                surface: '#F8FAFC',
                dark: '#0F172A',
                risk: {
                    high: '#EF4444',
                    medium: '#F59E0B',
                    low: '#10B981',
                },
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.5rem',
            },
            boxShadow: {
                card: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                'card-hover': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                glow: '0 0 15px rgba(37, 99, 235, 0.2)',
            },
        },
    },
    plugins: [],
};
