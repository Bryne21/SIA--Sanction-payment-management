import axios from 'axios';

// Determine API base URL
const getApiBaseUrl = () => {
  // In development, use relative paths (Vite proxy handles it)
  if (import.meta.env.DEV) {
    return '';
  }

  // In production, prefer an explicitly configured backend URL when available.
  // For Vercel deployments, empty string still works if /api/* is rewritten to Render.
  return import.meta.env.VITE_API_BASE_URL || '';
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getState = () => apiClient.get('/api/state');

export default apiClient;
