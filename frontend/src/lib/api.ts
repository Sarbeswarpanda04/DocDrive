import axios from 'axios';

const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_URL = `${BASE}/api`;

const TOKEN_KEY = 'dd_token';

export const saveToken = (t: string) => {
  if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, t);
};
export const clearToken = () => {
  if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
};
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach Bearer token if present in localStorage
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — redirect to login only on /auth/me 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url: string = error.config?.url || '';
    const is401 = error.response?.status === 401;
    const isAuthMe = url.includes('/auth/me');
    if (is401 && isAuthMe && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/login') && !currentPath.startsWith('/register')) {
        clearToken();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
