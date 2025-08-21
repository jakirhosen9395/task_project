import axios from 'axios';

export const authAPI = axios.create({
  baseURL: import.meta.env.VITE_AUTH_URL,
});

export const todoAPI = axios.create({
  baseURL: import.meta.env.VITE_TODO_URL,
});

export const analyticsAPI = axios.create({
  baseURL: import.meta.env.VITE_ANALYTICS_URL,
});