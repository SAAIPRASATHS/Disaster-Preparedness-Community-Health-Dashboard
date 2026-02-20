import { useTranslation } from 'react-i18next';

export default function ChecklistCard({ checklist }) {
    const { t } = useTranslation();
    if (!checklist) return null;

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-6 shadow-card">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-dark">
                    {t('checklist.preparedness')} — {checklist.disasterType}
                </h3>
                <span className="text-sm text-secondary bg-surface px-3 py-1 rounded-full">{t('checklist.items', { count: checklist.totalItems })}</span>
            </div>

            {/* Family profile */}
            <div className="flex flex-wrap gap-2 mb-5">
                {[
                    { label: t('checklist.family'), value: checklist.familyProfile.familyMembers },
                    { label: t('checklist.elderly'), value: checklist.familyProfile.elderly },
                    { label: t('checklist.children'), value: checklist.familyProfile.children },
                ].map((item) => (
                    <span key={item.label} className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full font-semibold">
                        {item.label}: {item.value}
                    </span>
                ))}
                {checklist.familyProfile.conditions.map((c) => (
                    <span key={c} className="bg-warning/15 text-warning text-xs px-3 py-1 rounded-full font-semibold">
                        {c}
                    </span>
                ))}
            </div>

            {/* Checklist */}
            <ul className="space-y-2">
                {checklist.checklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-dark/85 bg-emerald-50 px-4 py-2.5 rounded-xl">
                        <span className="text-risk-low mt-0.5 shrink-0 font-bold">✓</span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>

            {/* AI Tips */}
            {checklist.aiEnhancedTips?.length > 0 && (
                <div className="mt-6 border-t border-gray-100 pt-5">
                    <h4 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                        {t('checklist.aiRecommendations')}
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Groq</span>
                    </h4>
                    <ul className="space-y-2">
                        {checklist.aiEnhancedTips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-dark/85 bg-blue-50 border border-primary/10 px-4 py-2.5 rounded-xl">
                                <span className="text-primary mt-0.5 shrink-0">✦</span>
                                <span>{tip}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
