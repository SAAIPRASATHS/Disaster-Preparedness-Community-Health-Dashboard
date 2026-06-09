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
const EmergencyHealthWatch = lazy(() => import('./pages/EmergencyHealthWatch'));
const FileComplaint = lazy(() => import('./pages/FileComplaint'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const MapView = lazy(() => import('./pages/MapView'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const BotPage = lazy(() => import('./pages/BotPage'));

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
                        <div className="min-h-screen relative w-full overflow-x-hidden">
                            {/* Video Background */}
                            <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="fixed top-0 left-0 w-full h-full object-cover z-[-2]"
                            >
                                <source src="/bg-video.mp4" type="video/mp4" />
                            </video>
                            {/* Overlay for readability */}
                            <div className="fixed top-0 left-0 w-full h-full bg-slate-900/40 z-[-1]" />
                            
                            <Navbar />
                            <main className="max-w-7xl mx-auto px-4 pt-20 pb-10 relative z-10">
                                <Suspense fallback={<PageLoader />}>
                                    <Routes>
                                        <Route path="/" element={<RoleSelect />} />
                                        <Route path="/home" element={<Home />} />
                                        <Route path="/login" element={<Login />} />
                                        <Route path="/citizen-login" element={<Login />} />
                                        <Route path="/register" element={<Register />} />
                                        <Route path="/admin-login" element={<AdminLogin />} />
                                        <Route path="/report" element={<ProtectedRoute><EmergencyHealthWatch /></ProtectedRoute>} />
                                        <Route path="/health-watch" element={<ProtectedRoute><EmergencyHealthWatch /></ProtectedRoute>} />
                                        <Route path="/file-complaint" element={<ProtectedRoute><FileComplaint /></ProtectedRoute>} />
                                        <Route path="/user-dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
                                        <Route path="/citizen-dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
                                        <Route path="/admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                                        <Route path="/admin/community-hub" element={<AdminRoute><Report /></AdminRoute>} />
                                        <Route path="/map" element={<MapView />} />
                                        <Route path="/alerts" element={<Alerts />} />
                                        <Route path="/bot" element={<BotPage />} />
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
