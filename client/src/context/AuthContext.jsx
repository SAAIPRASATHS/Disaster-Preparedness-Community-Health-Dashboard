import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Restore user from localStorage on mount
        // Check admin session first, then citizen
        const adminToken = localStorage.getItem('dp_admin_token');
        const adminStored = localStorage.getItem('dp_admin_user');
        const citizenToken = localStorage.getItem('dp_citizen_token');
        const citizenStored = localStorage.getItem('dp_citizen_user');

        // Determine which session to restore based on the current URL
        const path = window.location.pathname;
        const isAdminPath = path.startsWith('/admin');

        try {
            if (isAdminPath && adminToken && adminStored) {
                setUser(JSON.parse(adminStored));
            } else if (!isAdminPath && citizenToken && citizenStored) {
                setUser(JSON.parse(citizenStored));
            } else if (adminToken && adminStored) {
                setUser(JSON.parse(adminStored));
            } else if (citizenToken && citizenStored) {
                setUser(JSON.parse(citizenStored));
            }
        } catch {
            // Clear corrupted data
            localStorage.removeItem('dp_admin_token');
            localStorage.removeItem('dp_admin_user');
            localStorage.removeItem('dp_citizen_token');
            localStorage.removeItem('dp_citizen_user');
        }

        // Also migrate old keys if present
        const oldToken = localStorage.getItem('dp_token');
        const oldUser = localStorage.getItem('dp_user');
        if (oldToken && oldUser) {
            try {
                const parsed = JSON.parse(oldUser);
                if (parsed.role === 'admin') {
                    localStorage.setItem('dp_admin_token', oldToken);
                    localStorage.setItem('dp_admin_user', oldUser);
                } else {
                    localStorage.setItem('dp_citizen_token', oldToken);
                    localStorage.setItem('dp_citizen_user', oldUser);
                }
                if (!user) setUser(parsed);
            } catch { /* ignore */ }
            localStorage.removeItem('dp_token');
            localStorage.removeItem('dp_user');
        }

        setLoading(false);
    }, []);

    const login = (token, userData) => {
        const isAdminUser = userData?.role === 'admin';
        if (isAdminUser) {
            localStorage.setItem('dp_admin_token', token);
            localStorage.setItem('dp_admin_user', JSON.stringify(userData));
        } else {
            localStorage.setItem('dp_citizen_token', token);
            localStorage.setItem('dp_citizen_user', JSON.stringify(userData));
        }
        setUser(userData);
    };

    const logout = () => {
        const isAdminUser = user?.role === 'admin';
        if (isAdminUser) {
            localStorage.removeItem('dp_admin_token');
            localStorage.removeItem('dp_admin_user');
        } else {
            localStorage.removeItem('dp_citizen_token');
            localStorage.removeItem('dp_citizen_user');
        }
        // Also clean up old keys
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
