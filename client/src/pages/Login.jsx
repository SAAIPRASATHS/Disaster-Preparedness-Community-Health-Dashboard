import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api';
import { useAuth } from '../context/AuthContext';
import { PageTransition, AnimatedCard } from '../components/Motion';
import { useToast } from '../components/Toast';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await loginUser({ email, password });
            login(data.token, data.user);
            toast.success(`Welcome back, ${data.user.name}!`);
            navigate(data.user.role === 'admin' ? '/admin-dashboard' : '/user-dashboard');
        } catch (err) {
            const msg = err.response?.data?.error || 'Login failed';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageTransition>
            <div className="max-w-md mx-auto mt-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-dark mb-2">Welcome Back</h1>
                    <p className="text-secondary text-sm">Sign in to access your dashboard</p>
                </div>
                <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-7 shadow-card">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-dark mb-1.5">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                                className="w-full bg-surface border border-gray-200 rounded-xl px-4 py-3 text-dark focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="you@example.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-dark mb-1.5">Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                                className="w-full bg-surface border border-gray-200 rounded-xl px-4 py-3 text-dark focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="••••••" />
                        </div>
                        {error && <p className="text-sm text-danger font-medium">{error}</p>}
                        <button type="submit" disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 disabled:bg-gray-300 text-white font-semibold py-3.5 rounded-2xl transition-all shadow-card hover:shadow-card-hover active:scale-[0.98]">
                            {loading ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>
                    <div className="mt-5 text-center text-sm text-secondary">
                        Don't have an account?{' '}
                        <a href="/register" className="text-primary font-semibold hover:underline">Register</a>
                    </div>
                    <div className="mt-2 text-center">
                        <a href="/admin-login" className="text-xs text-secondary hover:text-primary transition-colors">Admin Login →</a>
                    </div>
                </AnimatedCard>
            </div>
        </PageTransition>
    );
}
