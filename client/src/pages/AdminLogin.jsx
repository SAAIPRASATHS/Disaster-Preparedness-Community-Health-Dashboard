import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../api';
import { useAuth } from '../context/AuthContext';
import { PageTransition, AnimatedCard } from '../components/Motion';
import { useToast } from '../components/Toast';
import { useTranslation } from 'react-i18next';

export default function AdminLogin() {
    const { isAuthenticated, isAdmin, login } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isAuthenticated && isAdmin) {
            navigate('/admin-dashboard', { replace: true });
        } else if (isAuthenticated && !isAdmin) {
            navigate('/home', { replace: true });
        }
    }, [isAuthenticated, isAdmin, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await adminLogin({ email, password });
            login(data.token, data.user);
            toast.success(t('adminLogin.welcomeAdmin'));
            navigate('/admin-dashboard');
        } catch (err) {
            const msg = err.response?.data?.error || t('adminLogin.adminLoginFailed');
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageTransition>
            <div className="max-w-md mx-auto mt-12">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🔑</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-dark mb-2">{t('adminLogin.adminAccess')}</h1>
                    <p className="text-secondary text-sm">{t('adminLogin.restricted')}</p>
                </div>
                <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-7 shadow-card">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-dark mb-1.5">{t('adminLogin.adminEmail')}</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                                className="w-full bg-surface border border-gray-200 rounded-xl px-4 py-3 text-dark focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-dark mb-1.5">{t('common.password')}</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                                className="w-full bg-surface border border-gray-200 rounded-xl px-4 py-3 text-dark focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        </div>
                        {error && <p className="text-sm text-danger font-medium">{error}</p>}
                        <button type="submit" disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 disabled:bg-gray-300 text-white font-semibold py-3.5 rounded-2xl transition-all shadow-card hover:shadow-card-hover active:scale-[0.98]">
                            {loading ? t('adminLogin.verifying') : t('adminLogin.adminSignIn')}
                        </button>
                    </form>
                    <div className="mt-5 text-center">
                        <a href="/login" className="text-sm text-secondary hover:text-primary transition-colors">{t('adminLogin.backToUser')}</a>
                    </div>
                </AnimatedCard>
            </div>
        </PageTransition>
    );
}
