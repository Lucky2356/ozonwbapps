import axios from 'axios';
import { useAuth } from '../store/auth';

const baseURL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000') + '/api';

export const api = axios.create({ baseURL });

// Подставляем JWT в каждый запрос.
api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// При 401 — разлогиниваем.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      useAuth.getState().logout();
    }
    return Promise.reject(error);
  },
);
