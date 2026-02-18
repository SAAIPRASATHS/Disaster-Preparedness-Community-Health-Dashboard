/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                primary: '#5C7AEA',
                secondary: '#8E9AAF',
                accent: '#A7C7E7',
                warning: '#F0A500',
                danger: '#E85D75',
                surface: '#F4F6FB',
                dark: '#2E2E2E',
                risk: {
                    high: '#E85D75',
                    medium: '#F0A500',
                    low: '#4CAF82',
                },
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.5rem',
            },
            boxShadow: {
                card: '0 4px 24px rgba(92,122,234,0.08)',
                'card-hover': '0 8px 32px rgba(92,122,234,0.15)',
                glow: '0 0 20px rgba(92,122,234,0.2)',
            },
        },
    },
    plugins: [],
};
