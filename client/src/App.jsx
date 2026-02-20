import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import ChatBot from './components/ChatBot';
import ShakeHandler from './components/ShakeHandler';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

import RoleSelect from './pages/RoleSelect';
import Home from './pages/Home';
import Report from './pages/Report';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import MapView from './pages/MapView';
import Alerts from './pages/Alerts';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLogin from './pages/AdminLogin';

export default function App() {
    return (
        <AuthProvider>
            <SocketProvider>
                <ToastProvider>
                    <div className="min-h-screen bg-surface text-dark">
                        <Navbar />
                        <main className="max-w-7xl mx-auto px-4 py-6">
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
                        </main>
                        <ChatBot />
                        <ShakeHandler />
                    </div>
                </ToastProvider>
            </SocketProvider>
        </AuthProvider>
    );
}
