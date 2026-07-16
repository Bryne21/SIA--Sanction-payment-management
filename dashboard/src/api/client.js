import axios from 'axios';

// Determine API base URL
const getApiBaseUrl = () => {
  // In production (Render), use the environment variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // In development, use relative paths (Vite proxy will handle it)
  if (import.meta.env.DEV) {
    return '';
  }
  
  // Fallback to current origin
  return window.location.origin;
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getState = () => apiClient.get('/api/state');
export const logInfraction = (memberId, eventType, customEventName) => 
  apiClient.post('/api/infraction', { memberId, eventType, customEventName });

export default apiClient;
