import axios from 'axios';
import { GameRecommendation, ChatMessage } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for refresh token
});

// Request interceptor to add authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
          withCredentials: true,
        });

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('sessionId');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export interface GameRecommendationRequest {
  query?: string;
  preferences: string[];
  burnoutLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface GameRecommendationResponse {
  message: string;
  recommendations: GameRecommendation[];
  burnoutLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface PreAuthResponse {
  accessToken: string;
  accessExpiresIn: number;
  role: string;
  sessionId: string;
  steamId?: number;
}

export const authApi = {
  async preAuthorize(): Promise<PreAuthResponse> {
    try {
      const response = await api.post<PreAuthResponse>('/auth/preAuthorize');
      return response.data;
    } catch (error) {
      console.error('Error during pre-authorization:', error);
      throw new Error('Failed to pre-authorize');
    }
  }
};

export const gameRecommendationApi = {
  async getRecommendations(request: GameRecommendationRequest): Promise<GameRecommendationResponse> {
    try {
      const response = await api.post<GameRecommendationResponse>('/recommendations', request);
      return response.data;
    } catch (error) {
      console.error('Error fetching game recommendations:', error);
      throw new Error('Failed to get game recommendations');
    }
  },

  async sendMessage(message: string, preferences: string[]): Promise<ChatMessage> {
    try {
      const response = await api.post<ChatMessage>('/chat', {
        message,
        preferences,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }
};

export default api;


