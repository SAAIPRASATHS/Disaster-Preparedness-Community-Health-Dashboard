import { useTranslation } from 'react-i18next';

const COLORS = {
    HIGH: 'bg-red-50 border-risk-high/30',
    MEDIUM: 'bg-amber-50 border-warning/30',
    LOW: 'bg-emerald-50 border-risk-low/30',
};
const BADGE = { HIGH: 'bg-risk-high text-white', MEDIUM: 'bg-warning text-dark', LOW: 'bg-risk-low text-white' };

export default function RiskCard({ risk }) {
    const { t } = useTranslation();
    const style = COLORS[risk.riskLevel] || COLORS.LOW;
    const badge = BADGE[risk.riskLevel] || BADGE.LOW;

    return (
        <div className={`rounded-2xl border-2 p-6 ${style} transition-all duration-300 hover:shadow-card-hover`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-dark">{t(`disasterTypes.${risk.disasterType}`, risk.disasterType)}</h3>
                <span className={`${badge} text-xs font-bold px-3 py-1 rounded-full`}>
                    {t(`riskLevels.${risk.riskLevel}`, risk.riskLevel)}
                </span>
            </div>

            {/* Probability bar */}
            <div className="mb-4">
                <div className="flex justify-between text-sm mb-1.5 text-secondary">
                    <span>{t('riskCard.probability')}</span>
                    <span className="font-semibold text-dark">{(risk.probabilityScore * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                        className="h-2.5 rounded-full transition-all duration-700 ease-out"
                        style={{
                            width: `${risk.probabilityScore * 100}%`,
                            backgroundColor: risk.riskLevel === 'HIGH' ? '#E85D75' : risk.riskLevel === 'MEDIUM' ? '#F0A500' : '#4CAF82',
                        }}
                    />
                </div>
            </div>

            {/* Confidence */}
            {risk.confidenceScore != null && (
                <div className="mb-4 flex items-center gap-2">
                    <span className="text-xs text-secondary">{t('riskCard.confidence')}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div
                            className="h-1.5 rounded-full bg-primary transition-all duration-700"
                            style={{ width: `${risk.confidenceScore * 100}%` }}
                        />
                    </div>
                    <span className="text-xs font-semibold text-primary">{(risk.confidenceScore * 100).toFixed(0)}%</span>
                </div>
            )}

            {/* Secondary health risks */}
            {risk.secondaryHealthRisks?.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs font-semibold text-secondary mb-1.5">{t('riskCard.secondaryHealthRisks')}</p>
                    <div className="flex flex-wrap gap-1.5">
                        {risk.secondaryHealthRisks.map((r) => (
                            <span key={r} className="text-xs bg-red-100 text-risk-high px-2 py-0.5 rounded-full font-medium">{t(`healthRisks.${r}`, r)}</span>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <h4 className="text-sm font-semibold mb-2 text-secondary">{t('riskCard.recommendedActions')}</h4>
                <ul className="space-y-1.5">
                    {risk.recommendedPreparedness.map((item, i) => (
                        <li key={i} className="text-sm text-dark/80 flex items-start gap-2">
                            <span className="mt-0.5 shrink-0 text-primary font-bold">→</span>
                            <span>{t(`recommendations.${item}`, item)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
