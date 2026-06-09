import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from '../components/Motion';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ALL_SYMPTOMS = [
  { id: 'fever', icon: '🌡️' },
  { id: 'cough', icon: '🫁' },
  { id: 'vomiting', icon: '🤢' },
  { id: 'diarrhea', icon: '💧' },
  { id: 'rash', icon: '🔴' },
  { id: 'breathing_issues', icon: '😮‍💨' },
  { id: 'headache', icon: '🤕' },
  { id: 'fatigue', icon: '😴' },
  { id: 'sore_throat', icon: '🗣️' },
  { id: 'chest_pain', icon: '💔' },
  { id: 'nausea', icon: '😖' },
  { id: 'dizziness', icon: '😵' },
];

const RED_FLAG_SYMPTOMS = ['breathing_issues', 'chest_pain'];

const HEALTH_TIPS = {
  fever: ['tips.tip1', 'tips.tip2', 'tips.tip3', 'tips.tip4'],
  cough: ['tips.tip5', 'tips.tip6', 'tips.tip7', 'tips.tip8'],
  diarrhea: ['tips.tip9', 'tips.tip10', 'tips.tip11', 'tips.tip12'],
  breathing_issues: ['tips.tip13', 'tips.tip14', 'tips.tip15', 'tips.tip16'],
  rash: ['tips.tip17', 'tips.tip18', 'tips.tip19', 'tips.tip20'],
  vomiting: ['tips.tip21', 'tips.tip22', 'tips.tip23', 'tips.tip24'],
  chest_pain: ['tips.tip25', 'tips.tip26', 'tips.tip27', 'tips.tip28'],
  default: ['tips.tip29', 'tips.tip30', 'tips.tip31', 'tips.tip32'],
};

function getRiskColor(level) {
  if (!level) return 'text-slate-500 bg-slate-50';
  const l = level.toLowerCase();
  if (l === 'critical') return 'text-red-600 bg-red-50';
  if (l === 'high') return 'text-orange-600 bg-orange-50';
  if (l === 'medium') return 'text-amber-600 bg-amber-50';
  return 'text-emerald-600 bg-emerald-50';
}

export default function EmergencyHealthWatch() {
  const { user } = useAuth();
  const toast = useToast();
  const { t, i18n } = useTranslation();

  // Form state
  const [selected, setSelected] = useState([]);
  const [location, setLocation] = useState('');
  const [ageGroup, setAgeGroup] = useState('adult');
  const [severity, setSeverity] = useState('mild');
  const [duration, setDuration] = useState('less_than_1_day');
  const [submitting, setSubmitting] = useState(false);

  // Result state
  const [assessment, setAssessment] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // Community pulse
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const redFlagActive = selected.some(s => RED_FLAG_SYMPTOMS.includes(s));

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const { data } = await axios.get(`${API}/report/stats`);
      setStats(data);
    } catch { /* silent */ }
    finally { setStatsLoading(false); }
  }

  function toggleSymptom(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (selected.length === 0) { toast.error(t('healthWatch.noSymptomSelected')); return; }
    if (!location.trim()) { toast.error(t('healthWatch.enterLocation')); return; }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(`${API}/report`, {
        location, symptoms: selected, ageGroup, severity, duration,
      }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

      setAssessment(data.assessment);
      setSubmitted(true);
      fetchStats();
      toast.success(t('healthWatch.reportSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('healthWatch.submissionFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSelected([]); setLocation(''); setAgeGroup('adult');
    setSeverity('mild'); setDuration('less_than_1_day');
    setAssessment(null); setSubmitted(false);
  }

  const activeTips = selected.length > 0
    ? HEALTH_TIPS[selected[0]] || HEALTH_TIPS.default
    : HEALTH_TIPS.default;

  const healthScore = stats ? Math.max(0, Math.min(100,
    100 - (stats.today * 2) - (stats.weekly * 0.3)
  )) : 82;

  return (
    <PageTransition>
      <div className="pb-16">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>🏥</div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">{t('healthWatch.title')}</h1>
              <p className="text-slate-500 text-sm font-medium mt-1">{t('healthWatch.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full w-fit">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{t('healthWatch.liveSurveillance')}</span>
          </div>
        </div>

        {/* Red Flag Emergency Banner */}
        <AnimatePresence>
          {redFlagActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-8 p-6 rounded-3xl bg-red-600 text-white shadow-2xl shadow-red-600/30 border-4 border-red-400/30"
            >
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl animate-bounce">🚨</span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-200 mb-1">{t('healthWatch.medEmergency')}</p>
                  <h3 className="text-xl font-black">{t('healthWatch.seekAttention')}</h3>
                </div>
              </div>
              <p className="text-sm text-red-100 mb-5">{t('healthWatch.doNotWait')}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="tel:112" className="flex-1 py-3 bg-white text-red-600 rounded-2xl text-sm font-black text-center hover:bg-red-50 transition-colors uppercase tracking-widest">{t('healthWatch.call112Now')}</a>
                <a href="tel:108" className="flex-1 py-3 bg-red-500/50 text-white rounded-2xl text-sm font-black text-center hover:bg-red-500/70 transition-colors uppercase tracking-widest">{t('healthWatch.ambulance108')}</a>
                <a href="/map" className="flex-1 py-3 bg-red-500/50 text-white rounded-2xl text-sm font-black text-center hover:bg-red-500/70 transition-colors uppercase tracking-widest">{t('healthWatch.nearbyHospitals')}</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: Form or Assessment */}
          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Symptom Grid */}
                    <div className="glass-card p-6 md:p-8">
                      <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">{t('healthWatch.selectSymptoms')}</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {ALL_SYMPTOMS.map(sym => {
                          const isRed = RED_FLAG_SYMPTOMS.includes(sym.id);
                          const isChosen = selected.includes(sym.id);
                          return (
                            <button
                              key={sym.id}
                              type="button"
                              onClick={() => toggleSymptom(sym.id)}
                              className={`p-4 rounded-2xl border-2 text-center transition-all duration-200 active:scale-95 ${
                                isChosen
                                  ? isRed ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20'
                                           : 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                  : isRed ? 'bg-red-50 border-red-100 text-red-700 hover:border-red-300'
                                           : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className="text-2xl mb-1.5">{sym.icon}</div>
                              <p className="text-[10px] font-black uppercase tracking-wide leading-tight">{t(`symptoms.${sym.id}`)}</p>
                              {isRed && <p className="text-[8px] font-black text-red-400 mt-1 uppercase">⚠ {t('healthWatch.highRisk')}</p>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Additional Fields */}
                    <div className="glass-card p-6 md:p-8">
                      <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">{t('healthWatch.additionalInfo')}</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{t('healthWatch.locationLabel')}</label>
                          <input
                            type="text"
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            placeholder={t('healthWatch.locationPlaceholder')}
                            className="premium-input w-full"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{t('healthWatch.ageGroup')}</label>
                          <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)} className="premium-input w-full">
                            <option value="child">{t('healthWatch.child')}</option>
                            <option value="teen">{t('healthWatch.teen')}</option>
                            <option value="adult">{t('healthWatch.adult')}</option>
                            <option value="senior">{t('healthWatch.senior')}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{t('healthWatch.severityLevel')}</label>
                          <div className="flex gap-2">
                            {['mild', 'moderate', 'severe'].map(s => (
                              <button key={s} type="button" onClick={() => setSeverity(s)}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${severity === s
                                  ? s === 'severe' ? 'bg-red-500 text-white' : s === 'moderate' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                              >{t(`healthWatch.${s}`)}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{t('healthWatch.symptomDuration')}</label>
                          <select value={duration} onChange={e => setDuration(e.target.value)} className="premium-input w-full">
                            <option value="less_than_1_day">{t('healthWatch.duration1')}</option>
                            <option value="1_to_3_days">{t('healthWatch.duration2')}</option>
                            <option value="3_to_7_days">{t('healthWatch.duration3')}</option>
                            <option value="more_than_7_days">{t('healthWatch.duration4')}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-5 rounded-2xl text-white font-black text-lg tracking-wide transition-all shadow-2xl shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:scale-95"
                      style={{ background: 'linear-gradient(135deg, var(--primary), #6366f1)' }}
                    >
                      {submitting ? (
                        <span className="flex items-center justify-center gap-3">
                          <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                          {t('healthWatch.analyzing')}
                        </span>
                      ) : t('healthWatch.submitReport')}
                    </button>

                    <p className="text-center text-[10px] text-slate-400 font-medium">{t('healthWatch.anonymousData')}</p>
                  </form>
                </motion.div>
              ) : (
                <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  {/* AI Assessment Result */}
                  <div className={`glass-card p-8 border-2 ${assessment?.riskLevel === 'Critical' || assessment?.riskLevel === 'High' ? 'border-red-200' : 'border-emerald-200'}`}>
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-3xl">🤖</span>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('healthWatch.feature2')}</p>
                        <h3 className="text-xl font-black text-slate-900">{t('healthWatch.assessmentComplete')}</h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      <div className="bg-slate-50 rounded-2xl p-5 text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('healthWatch.possibleCondition')}</p>
                        <p className="text-sm font-black text-slate-900">{assessment?.condition || 'General Illness'}</p>
                      </div>
                      <div className={`rounded-2xl p-5 text-center ${getRiskColor(assessment?.riskLevel)}`}>
                        <p className="text-[9px] font-black uppercase tracking-widest mb-2 opacity-70">{t('healthWatch.riskLevel')}</p>
                        <p className="text-2xl font-black">{assessment?.riskLevel || 'Low'}</p>
                      </div>
                      <div className="bg-emerald-50 rounded-2xl p-5 text-center">
                        <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-2">{t('healthWatch.status')}</p>
                        <p className="text-xs font-black text-emerald-900">{t('healthWatch.pendingAnalysis')}</p>
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse mx-auto mt-2" />
                      </div>
                    </div>

                    <div className="bg-indigo-50 rounded-2xl p-5 mb-6 border border-indigo-100">
                      <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">{t('healthWatch.recommendation')}</p>
                      <p className="text-sm font-bold text-indigo-900">{assessment?.recommendation}</p>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                      <p className="text-[10px] font-bold text-amber-700">⚕️ <strong>{t('healthWatch.medDisclaimer')}</strong></p>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={resetForm} className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors">{t('healthWatch.submitAnother')}</button>
                      <a href="tel:112" className="flex-1 py-3 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest text-center hover:bg-red-600 transition-colors">{t('healthWatch.call112')}</a>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: Sidebar */}
          <div className="space-y-6">
            {/* Community Health Pulse */}
            <div className="glass-card p-6 border-2 border-indigo-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-5">{t('healthWatch.feature4')}</h3>
              {statsLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full" /></div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: t('healthWatch.todays'), value: stats?.today ?? '—', color: 'text-rose-600', bg: 'bg-rose-50' },
                      { label: t('healthWatch.weekly'), value: stats?.weekly ?? '—', color: 'text-amber-600', bg: 'bg-amber-50' },
                      { label: t('healthWatch.monthly'), value: stats?.monthly ?? '—', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    ].map(s => (
                      <div key={s.label} className={`${s.bg} rounded-2xl p-3 text-center`}>
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Health Score */}
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-center mb-5 text-white">
                    <p className="text-[9px] font-black uppercase tracking-widest mb-2 text-indigo-200">{t('healthWatch.communityHealthScore')}</p>
                    <p className="text-5xl font-black">{Math.round(healthScore)}</p>
                    <p className="text-sm font-bold text-indigo-200">/100</p>
                    <p className="text-[9px] text-indigo-200 mt-2 uppercase tracking-widest">{healthScore >= 80 ? t('healthWatch.healthy') : healthScore >= 60 ? t('healthWatch.moderateRisk') : t('healthWatch.atRisk')}</p>
                  </div>

                  {/* Top Symptoms */}
                  {stats?.topSymptoms?.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('healthWatch.topReported')}</p>
                      <div className="space-y-2">
                        {stats.topSymptoms.slice(0, 5).map((s, i) => {
                          const sym = ALL_SYMPTOMS.find(a => a.id === s.symptom);
                          const pct = stats.weekly > 0 ? Math.round((s.count / stats.weekly) * 100) : 0;
                          return (
                            <div key={s.symptom} className="flex items-center gap-3">
                              <span className="text-sm">{sym?.icon || '🔹'}</span>
                              <div className="flex-1">
                                <div className="flex justify-between mb-0.5">
                                  <span className="text-[10px] font-black text-slate-600 capitalize">{t(`symptoms.${s.symptom}`) || s.symptom.replace(/_/g, ' ')}</span>
                                  <span className="text-[9px] font-black text-slate-400">{s.count}</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Health Tips */}
            <div className="glass-card p-6 border-2 border-emerald-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">{t('healthWatch.feature5')}</h3>
              <div className="space-y-2 mb-5">
                {activeTips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl">
                    <span className="text-emerald-500 text-xs font-black mt-0.5">{i + 1}.</span>
                    <p className="text-xs font-bold text-emerald-800">{t(tip)}</p>
                  </div>
                ))}
              </div>
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-4 text-white">
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-100 mb-1">🌧️ {t('healthWatch.dailyTip')}</p>
                <p className="text-xs font-black mb-1">{t('tips.dailyTipTitle')}</p>
                <p className="text-[10px] text-amber-100 leading-relaxed">{t('tips.dailyTipDesc')}</p>
              </div>
            </div>

            {/* Emergency Quick Dial */}
            <div className="glass-card p-6 border-2 border-rose-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">{t('healthWatch.emergencyContacts')}</h3>
              <div className="space-y-2">
                {[
                  { label: t('healthWatch.integratedEmergency'), num: '112', color: 'bg-red-500' },
                  { label: t('healthWatch.ambulance'), num: '108', color: 'bg-rose-500' },
                  { label: t('healthWatch.disasterMgmt'), num: '1070', color: 'bg-orange-500' },
                ].map(c => (
                  <a key={c.num} href={`tel:${c.num}`} className={`flex items-center justify-between p-3 rounded-xl ${c.color}/10 border border-${c.color}/20 hover:${c.color}/20 transition-colors`}>
                    <span className="text-xs font-bold text-slate-700">{c.label}</span>
                    <span className={`text-sm font-black text-red-600`}>{c.num}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
