import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Attach JWT token to every request — pick admin or citizen token based on current path
API.interceptors.request.use((config) => {
    const isAdminPath = window.location.pathname.startsWith('/admin');
    const token = isAdminPath
        ? localStorage.getItem('dp_admin_token')
        : localStorage.getItem('dp_citizen_token');
    // Fallback: try the other token if primary is missing
    const fallbackToken = isAdminPath
        ? localStorage.getItem('dp_citizen_token')
        : localStorage.getItem('dp_admin_token');
    const finalToken = token || fallbackToken || localStorage.getItem('dp_token');
    if (finalToken) {
        config.headers.Authorization = `Bearer ${finalToken}`;
    }
    return config;
});

// Auth API
export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const adminLogin = (data) => API.post('/auth/admin-login', data);

// Existing API
export const fetchRisk = (params) => {
    if (typeof params === 'string') return API.get(`/risk?city=${encodeURIComponent(params)}`);
    const { lat, lon, city } = params;
    const query = new URLSearchParams();
    if (city) query.append('city', city);
    if (lat != null && lon != null) {
        query.append('lat', lat);
        query.append('lon', lon);
    }
    return API.get(`/risk?${query.toString()}`);
};
export const fetchChecklist = (data) => API.post('/preparedness', data);
export const submitReport = (data) => API.post('/report', data);
export const fetchReports = () => API.get('/report');
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

// Resources API
export const fetchResources = (lat, lon, radius) => {
    const params = [];
    if (lat != null && lon != null) {
        params.push(`lat=${lat}`, `lon=${lon}`);
        if (radius) params.push(`radius=${radius}`);
    }
    return API.get(`/resources${params.length ? '?' + params.join('&') : ''}`);
};
export const updateResourceStatus = (id, data) => API.patch(`/resources/${id}`, data);
export const addResource = (data) => API.post('/resources', data);


export default API;
