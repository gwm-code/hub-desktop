import axios from 'axios';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';

// Create a stable instance
const api = axios.create();

// Interceptor to always use the latest serverUrl and Token
api.interceptors.request.use((config) => {
  const { serverUrl } = useSettingsStore.getState();
  const { token } = useAuthStore.getState();
  
  config.baseURL = serverUrl;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

export default api;
