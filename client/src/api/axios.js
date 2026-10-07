import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — inject token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hb_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hb_token');
      localStorage.removeItem('hb_user');
      // Only redirect if not already on a public page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
