import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../api';
import { useAuth } from '../context/AuthContext';
import { PageTransition, AnimatedCard } from '../components/Motion';
import { useToast } from '../components/Toast';

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '', familyMembers: 4, elderly: 0, children: 0, conditions: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
    const setNum = (key) => (e) => setForm((p) => ({ ...p, [key]: parseInt(e.target.value) || 0 }));
    const toggleCondition = (c) =>
        setForm((p) => ({ ...p, conditions: p.conditions.includes(c) ? p.conditions.filter((x) => x !== c) : [...p.conditions, c] }));

    const conditionOptions = ['diabetes', 'asthma', 'heart_disease', 'hypertension'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await registerUser(form);
            login(data.token, data.user);
            toast.success('Account created successfully!');
            navigate('/user-dashboard');
        } catch (err) {
            const msg = err.response?.data?.error || 'Registration failed';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageTransition>
            <div className="max-w-lg mx-auto mt-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-dark mb-2">Create Account</h1>
                    <p className="text-secondary text-sm">Join your community's disaster preparedness network</p>
                </div>
                <AnimatedCard className="bg-white border border-gray-200 rounded-2xl p-7 shadow-card">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-semibold text-dark mb-1.5">Full Name</label>
                                <input type="text" value={form.name} onChange={set('name')} required
                                    className="w-full bg-surface border border-gray-200 rounded-xl px-4 py-3 text-dark focus:outline-none focus:ring-2 focus:ring-primary/40" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-semibold text-dark mb-1.5">Email</label>
                                <input type="email" value={form.email} onChange={set('email')} required
                                    className="w-full bg-surface border border-gray-200 rounded-xl px-4 py-3 text-dark focus:outline-none focus:ring-2 focus:ring-primary/40" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-semibold text-dark mb-1.5">Password</label>
                                <input type="password" value={form.password} onChange={set('password')} required minLength={6}
                                    className="w-full bg-surface border border-gray-200 rounded-xl px-4 py-3 text-dark focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="Min 6 characters" />
                            </div>
                        </div>

                        <hr className="border-gray-100" />
                        <p className="text-xs text-secondary font-semibold uppercase tracking-wider">Family Profile</p>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs text-secondary block mb-1">Family</label>
                                <input type="number" min={1} value={form.familyMembers} onChange={setNum('familyMembers')}
                                    className="w-full bg-surface border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:ring-1 focus:ring-primary/30" />
                            </div>
                            <div>
                                <label className="text-xs text-secondary block mb-1">Elderly</label>
                                <input type="number" min={0} value={form.elderly} onChange={setNum('elderly')}
                                    className="w-full bg-surface border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:ring-1 focus:ring-primary/30" />
                            </div>
                            <div>
                                <label className="text-xs text-secondary block mb-1">Children</label>
                                <input type="number" min={0} value={form.children} onChange={setNum('children')}
                                    className="w-full bg-surface border border-gray-200 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:ring-1 focus:ring-primary/30" />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {conditionOptions.map((c) => (
                                <button key={c} type="button" onClick={() => toggleCondition(c)}
                                    className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all font-medium ${form.conditions.includes(c)
                                        ? 'bg-primary/10 border-primary text-primary' : 'border-gray-200 text-secondary hover:border-gray-300'}`}>
                                    {c.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        {error && <p className="text-sm text-danger font-medium">{error}</p>}
                        <button type="submit" disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 disabled:bg-gray-300 text-white font-semibold py-3.5 rounded-2xl transition-all shadow-card hover:shadow-card-hover active:scale-[0.98]">
                            {loading ? 'Creating account…' : 'Create Account'}
                        </button>
                    </form>
                    <div className="mt-5 text-center text-sm text-secondary">
                        Already have an account?{' '}
                        <a href="/login" className="text-primary font-semibold hover:underline">Sign In</a>
                    </div>
                </AnimatedCard>
            </div>
        </PageTransition>
    );
}
