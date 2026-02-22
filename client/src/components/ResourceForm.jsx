import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { addResource } from '../api';
import { useToast } from './Toast';

export default function ResourceForm({ onResourceAdded }) {
    const { t } = useTranslation();
    const toast = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'food_point',
        lat: '',
        lon: '',
        address: '',
        contact: '',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const resourceData = {
                name: formData.name,
                type: formData.type,
                location: {
                    type: 'Point',
                    coordinates: [parseFloat(formData.lon), parseFloat(formData.lat)],
                },
                address: formData.address,
                contact: formData.contact,
                status: {
                    foodAvailable: formData.type === 'food_point' ? true : undefined,
                },
            };

            const response = await addResource(resourceData);
            toast.success(t('adminDashboard.resourceAdded'));
            setFormData({
                name: '',
                type: 'food_point',
                lat: '',
                lon: '',
                address: '',
                contact: '',
            });
            setIsOpen(false);
            if (onResourceAdded) onResourceAdded(response.data);
        } catch (error) {
            console.error('Error adding resource:', error);
            toast.error(error.response?.data?.message || 'Failed to add resource');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mb-10">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-all duration-500 shadow-xl ${isOpen ? 'bg-slate-900 text-white shadow-slate-900/20' : 'bg-primary text-white shadow-primary/20 hover:scale-[1.02] active:scale-95'}`}
            >
                <span className="text-lg leading-none">{isOpen ? '✕' : '＋'}</span>
                {t('adminDashboard.addResource')}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <form
                            onSubmit={handleSubmit}
                            className="mt-6 p-10 glass-card grid grid-cols-1 md:grid-cols-2 gap-8 relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex flex-col gap-2 relative z-10">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">{t('adminDashboard.resourceName')}</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="premium-input w-full"
                                    placeholder="e.g. Coimbatore Food Bank"
                                />
                            </div>

                            <div className="flex flex-col gap-2 relative z-10">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">{t('adminDashboard.resourceType')}</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="premium-input w-full bg-white appearance-none cursor-pointer"
                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                                >
                                    <option value="food_point">🍱 {t('map.food')}</option>
                                    <option value="rescue_center">🆘 {t('adminDashboard.rescueCenter')}</option>
                                    <option value="fire_station">🚒 {t('map.fire')}</option>
                                    <option value="police_station">👮 {t('map.police')}</option>
                                    <option value="hospital">🏥 {t('map.hospital')}</option>
                                    <option value="hotel">🏨 {t('map.hotel')}</option>
                                    <option value="government_office">🏛️ {t('map.government')}</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-2 relative z-10">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">{t('adminDashboard.latitude')}</label>
                                <input
                                    required
                                    type="number"
                                    step="any"
                                    value={formData.lat}
                                    onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                                    className="premium-input w-full"
                                    placeholder="11.0168"
                                />
                            </div>

                            <div className="flex flex-col gap-2 relative z-10">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">{t('adminDashboard.longitude')}</label>
                                <input
                                    required
                                    type="number"
                                    step="any"
                                    value={formData.lon}
                                    onChange={(e) => setFormData({ ...formData, lon: e.target.value })}
                                    className="premium-input w-full"
                                    placeholder="76.9558"
                                />
                            </div>

                            <div className="flex flex-col gap-2 relative z-10">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">{t('adminDashboard.address')}</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="premium-input w-full"
                                    placeholder="Full address"
                                />
                            </div>

                            <div className="flex flex-col gap-2 relative z-10">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">{t('adminDashboard.contact')}</label>
                                <input
                                    type="text"
                                    value={formData.contact}
                                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                    className="premium-input w-full"
                                    placeholder="Phone number"
                                />
                            </div>

                            <div className="md:col-span-2 pt-6 flex gap-6 relative z-10">
                                <button
                                    disabled={loading}
                                    type="submit"
                                    className="flex-1 bg-slate-900 text-white h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {loading ? t('adminDashboard.adding') : t('common.submit')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-10 h-14 bg-white border border-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
                                >
                                    {t('common.cancel')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
