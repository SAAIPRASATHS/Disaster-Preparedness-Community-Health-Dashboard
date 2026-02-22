import { useTranslation } from 'react-i18next';

export default function ChecklistCard({ checklist }) {
    const { t } = useTranslation();
    if (!checklist) return null;

    return (
        <div className="glass-card p-10 mt-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all" />

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                        {t('checklist.preparedness')}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                        {checklist.disasterType} STRATEGY
                    </p>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-3xl font-black text-slate-900 leading-none">{checklist.totalItems}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('checklist.items', { count: '' }).trim()}</span>
                </div>
            </div>

            {/* Family profile */}
            <div className="flex flex-wrap gap-2 mb-8 relative z-10">
                {[
                    { label: t('checklist.family'), value: checklist.familyProfile.familyMembers, icon: '🏠' },
                    { label: t('checklist.elderly'), value: checklist.familyProfile.elderly, icon: '👴' },
                    { label: t('checklist.children'), value: checklist.familyProfile.children, icon: '👶' },
                ].map((item) => (
                    <div key={item.label} className="bg-white/50 border border-slate-100 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
                        <span className="text-xs">{item.icon}</span>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                            {item.label}: <span className="text-slate-900">{item.value}</span>
                        </span>
                    </div>
                ))}
                {checklist.familyProfile.conditions.map((c) => (
                    <div key={c} className="bg-amber-50/50 border border-amber-100 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
                        <span className="text-xs">⚠️</span>
                        <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">{c}</span>
                    </div>
                ))}
            </div>

            {/* Checklist */}
            <div className="space-y-3 relative z-10">
                {checklist.checklist.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 group/item">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black shrink-0 group-hover/item:bg-emerald-500 group-hover/item:text-white transition-all shadow-sm">
                            ✓
                        </div>
                        <p className="text-[13px] font-medium text-slate-600 leading-snug">{item}</p>
                    </div>
                ))}
            </div>

            {/* AI Tips */}
            {checklist.aiEnhancedTips?.length > 0 && (
                <div className="mt-10 pt-8 border-t border-slate-100 relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                            {t('checklist.aiRecommendations')}
                        </h4>
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">GROQ INTELLIGENCE LPU</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {checklist.aiEnhancedTips.map((tip, i) => (
                            <div key={i} className="flex items-start gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10 hover:bg-primary/10 transition-all cursor-default">
                                <span className="text-primary text-sm mt-0.5 shrink-0">✦</span>
                                <p className="text-[12px] font-semibold text-primary/80 leading-relaxed italic">"{tip}"</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
