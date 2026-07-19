import axios from 'axios';

// Determine API base URL
const getApiBaseUrl = () => {
  // In development, use relative paths (Vite proxy handles it)
  if (import.meta.env.DEV) {
    return '';
  }
  
  // In production, use Vercel rewrites (which forward to Render backend)
  // Vercel's vercel.json handles routing /api/* to the Render backend
  return '';
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getState = () => apiClient.get('/api/state');

export default apiClient;
