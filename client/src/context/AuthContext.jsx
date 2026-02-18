import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Restore user from localStorage on mount
        const token = localStorage.getItem('dp_token');
        const stored = localStorage.getItem('dp_user');
        if (token && stored) {
            try {
                setUser(JSON.parse(stored));
            } catch {
                localStorage.removeItem('dp_token');
                localStorage.removeItem('dp_user');
            }
        }
        setLoading(false);
    }, []);

    const login = (token, userData) => {
        localStorage.setItem('dp_token', token);
        localStorage.setItem('dp_user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('dp_token');
        localStorage.removeItem('dp_user');
        setUser(null);
    };

    const isAdmin = user?.role === 'admin';
    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider value={{ user, login, logout, isAdmin, isAuthenticated, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
