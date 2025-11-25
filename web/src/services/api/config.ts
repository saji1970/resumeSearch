// Auto-detect API URL based on environment
// In production (Railway), use same origin for API
// In development, use localhost:3000
const getApiUrl = () => {
  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production (Railway), API is on same origin
  if (import.meta.env.PROD) {
    return '/api';
  }
  
  // Development fallback
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiUrl();

export default API_BASE_URL



