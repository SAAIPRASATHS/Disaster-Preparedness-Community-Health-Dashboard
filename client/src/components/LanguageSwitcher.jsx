import { useTranslation } from 'react-i18next';

const languages = [
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'hi', label: 'हिं', flag: '🇮🇳' },
    { code: 'ta', label: 'தமி', flag: '🇮🇳' },
];

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();

    return (
        <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 border border-slate-200">
            {languages.map((lang) => (
                <button
                    key={lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${i18n.language === lang.code
                        ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                        }`}
                    title={lang.code.toUpperCase()}
                >
                    {lang.label}
                </button>
            ))}
        </div>
    );
}
