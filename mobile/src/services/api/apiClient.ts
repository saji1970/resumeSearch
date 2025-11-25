import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from './config';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - handle FormData and add auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Don't set Content-Type for FormData - let axios set it automatically
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    // Add token to requests
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('token');
      // Navigate to login (handled by app state)
    }
    return Promise.reject(error);
  }
);

export default apiClient;

