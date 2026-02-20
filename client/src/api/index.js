import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Attach JWT token to every request if available
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('dp_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth API
export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const adminLogin = (data) => API.post('/auth/admin-login', data);

// Existing API
export const fetchRisk = (city) => API.get(`/risk?city=${encodeURIComponent(city)}`);
export const fetchChecklist = (data) => API.post('/preparedness', data);
export const submitReport = (data) => API.post('/report', data);
export const fetchClusters = () => API.get('/cluster');

// SOS API
export const submitSOS = (data) => API.post('/sos', data);
export const fetchSOSAlerts = () => API.get('/sos');
export const resolveSOSAlert = (id) => API.patch(`/sos/${id}/resolve`);

// Complaint API
export const submitComplaint = (data) => API.post('/complaint', data);
export const fetchComplaints = () => API.get('/complaint');
export const updateComplaintStatus = (id, status) => API.patch(`/complaint/${id}/status`, { status });
export const resolveComplaint = (id) => API.put(`/complaint/${id}/resolve`);

// Live Alerts API
export const fetchLiveAlerts = () => API.get('/live-alert');

// Chat API (Groq)
export const sendChatMessage = (messages) => API.post('/chat', { messages });

// Weather API (Open-Meteo — no key needed)
export const fetchWeather = (lat, lon) => API.get(`/weather?lat=${lat}&lon=${lon}`);
export const fetchWeatherByCity = (city) => API.get(`/weather?city=${encodeURIComponent(city)}`);

// Air Quality API (Open-Meteo — no key needed)
export const fetchAirQuality = (lat, lon) => API.get(`/airquality?lat=${lat}&lon=${lon}`);
export const fetchAirQualityByCity = (city) => API.get(`/airquality?city=${encodeURIComponent(city)}`);

// Pollen API (Open-Meteo — no key needed)
export const fetchPollen = (lat, lon) => API.get(`/pollen?lat=${lat}&lon=${lon}`);
export const fetchPollenByCity = (city) => API.get(`/pollen?city=${encodeURIComponent(city)}`);

export default API;
