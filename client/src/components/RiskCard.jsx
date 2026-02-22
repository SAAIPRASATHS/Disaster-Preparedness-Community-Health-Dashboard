import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const THEMES = {
    HIGH: 'from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/20 text-rose-600',
    MEDIUM: 'from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 text-amber-700',
    LOW: 'from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 text-emerald-600',
};

const ACCENTS = {
    HIGH: 'bg-rose-500',
    MEDIUM: 'bg-amber-500',
    LOW: 'bg-emerald-500',
};

export default function RiskCard({ risk }) {
    const { t } = useTranslation();
    const theme = THEMES[risk.riskLevel] || THEMES.LOW;
    const accent = ACCENTS[risk.riskLevel] || ACCENTS.LOW;

    return (
        <div className={`glass-card rounded-[2rem] border-2 p-8 bg-gradient-to-br ${theme} overflow-hidden relative`}>
            {/* Background Accent Sphere */}
            <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full opacity-10 blur-3xl ${accent}`} />

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                        {t(`disasterTypes.${risk.disasterType}`, risk.disasterType)}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {t('riskCard.analysisReport') || 'Live Assessment'}
                    </p>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${theme}`}>
                    {t(`riskLevels.${risk.riskLevel}`, risk.riskLevel)}
                </div>
            </div>

            {/* Probability Segment */}
            <div className="mb-8 relative z-10">
                <div className="flex justify-between items-end mb-3">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">{t('riskCard.probability')}</span>
                    <span className="text-2xl font-black text-slate-900">{(risk.probabilityScore * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${risk.probabilityScore * 100}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`h-full rounded-full ${accent} shadow-lg shadow-current/20`}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                {/* Secondary Risks */}
                {risk.secondaryHealthRisks?.length > 0 && (
                    <div className="p-5 bg-white/40 rounded-3xl border border-white/60">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                            {t('riskCard.secondaryHealthRisks')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {risk.secondaryHealthRisks.map((r) => (
                                <span key={r} className={`px-3 py-1 rounded-xl text-[10px] font-bold border ${theme} bg-white/50 backdrop-blur-sm`}>
                                    {t(`healthRisks.${r}`, r)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommendations */}
                <div className="p-5 bg-white/40 rounded-3xl border border-white/60">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                        {t('riskCard.recommendedActions')}
                    </h4>
                    <ul className="space-y-3">
                        {risk.recommendedPreparedness.map((item, i) => (
                            <li key={i} className="text-xs text-slate-700 font-medium flex items-center gap-3">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${accent}`} />
                                <span className="leading-relaxed">{t(`recommendations.${item}`, item)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
