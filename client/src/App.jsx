import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './components/Toast';
import { LazyMotion, domAnimation } from 'framer-motion';
import Navbar from './components/Navbar';
import ChatBot from './components/ChatBot';
import ShakeHandler from './components/ShakeHandler';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// Lazy load pages for performance
const RoleSelect = lazy(() => import('./pages/RoleSelect'));
const Home = lazy(() => import('./pages/Home'));
const Report = lazy(() => import('./pages/Report'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const MapView = lazy(() => import('./pages/MapView'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));

const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full" />
    </div>
);

export default function App() {
    return (
        <AuthProvider>
            <SocketProvider>
                <ToastProvider>
                    <LazyMotion features={domAnimation}>
                        <div className="min-h-screen bg-surface text-dark">
                            <Navbar />
                            <main className="max-w-7xl mx-auto px-4 py-6">
                                <Suspense fallback={<PageLoader />}>
                                    <Routes>
                                        <Route path="/" element={<RoleSelect />} />
                                        <Route path="/home" element={<Home />} />
                                        <Route path="/login" element={<Login />} />
                                        <Route path="/citizen-login" element={<Login />} />
                                        <Route path="/register" element={<Register />} />
                                        <Route path="/admin-login" element={<AdminLogin />} />
                                        <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
                                        <Route path="/user-dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
                                        <Route path="/citizen-dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
                                        <Route path="/admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                                        <Route path="/map" element={<MapView />} />
                                        <Route path="/alerts" element={<Alerts />} />
                                    </Routes>
                                </Suspense>
                            </main>
                            <ChatBot />
                            <ShakeHandler />
                        </div>
                    </LazyMotion>
                </ToastProvider>
            </SocketProvider>
        </AuthProvider>
    );
}
