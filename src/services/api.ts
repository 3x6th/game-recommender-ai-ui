import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { GameRecommendation, ChatMessage } from '../types';
import { tokenManager } from '../utils/tokenManager';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Track if a refresh is in progress and queue pending requests
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let failedRefreshQueue: Array<(error: any) => void> = [];
let successRefreshQueue: Array<(token: string) => void> = [];

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
    const token = tokenManager.getAccessToken();
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
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If already refreshing, queue this request
      if (isRefreshing && refreshPromise) {
        return new Promise((resolve, reject) => {
          successRefreshQueue.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
          failedRefreshQueue.push((error: any) => {
            reject(error);
          });
        });
      }

      // Start refresh process
      isRefreshing = true;
      refreshPromise = refreshAccessToken();

      try {
        const newToken = await refreshPromise;

        if (newToken) {
          // Process queued requests
          successRefreshQueue.forEach((callback) => callback(newToken));
          successRefreshQueue = [];
          failedRefreshQueue = [];

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          throw new Error('Token refresh failed');
        }
      } catch (refreshError) {
        // Notify queued requests of failure
        failedRefreshQueue.forEach((callback) => callback(refreshError));
        successRefreshQueue = [];
        failedRefreshQueue = [];

        // Clear tokens and reject
        tokenManager.clearTokens();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Refresh the access token using the refresh token cookie
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      {},
      {
        withCredentials: true,
      }
    );

    const { accessToken, accessExpiresIn, sessionId } = response.data;

    if (accessToken) {
      tokenManager.setTokens({
        accessToken,
        sessionId,
        expiresIn: accessExpiresIn,
      });
      return accessToken;
    }

    return null;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

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
  },

  async refresh(): Promise<PreAuthResponse> {
    try {
      const response = await axios.post<PreAuthResponse>(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error during token refresh:', error);
      throw new Error('Failed to refresh token');
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


