import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { GameRecommendation } from '../types';
import { tokenManager } from '../utils/tokenManager';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Track if a refresh is in progress and queue pending requests
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let failedRefreshQueue: Array<(error: unknown) => void> = [];
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
          failedRefreshQueue.push((err: unknown) => {
            reject(err);
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
        // Refresh token also expired, try to re-authenticate with preAuthorize
        console.log('Refresh token expired, attempting pre-authorization...');

        try {
          const preAuthResponse = await axios.post<PreAuthResponse>(
            `${API_BASE_URL}/auth/preAuthorize`,
            {},
            {
              withCredentials: true,
            }
          );

          if (preAuthResponse.data.accessToken) {
            const { accessToken, sessionId, accessExpiresIn } = preAuthResponse.data;

            tokenManager.setTokens({
              accessToken,
              sessionId,
              expiresIn: accessExpiresIn,
            });

            // Process queued requests with new token
            successRefreshQueue.forEach((callback) => callback(accessToken));
            successRefreshQueue = [];
            failedRefreshQueue = [];

            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        } catch (preAuthError) {
          console.error('Pre-authorization also failed:', preAuthError);
        }

        // Both refresh and preAuth failed, notify queued requests
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
    const response = await axios.post<AccessTokenResponse>(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });

    const { accessToken, accessExpiresIn } = response.data;

    if (accessToken) {
      const payload = tokenManager.decodeToken(accessToken);
      const sessionId =
        (payload && typeof payload.sub === 'string' ? payload.sub : null) ?? tokenManager.getSessionId() ?? '';

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

export interface PreAuthResponse {
  accessToken: string;
  accessExpiresIn: number;
  role: string;
  sessionId: string;
  steamId?: number;
}

export interface AccessTokenResponse {
  accessToken: string;
  accessExpiresIn: number;
}

export interface AuthSession {
  accessToken: string;
  accessExpiresIn: number;
  role: string;
  sessionId: string;
  steamId?: number;
}

export function authSessionFromPreAuth(resp: PreAuthResponse): AuthSession {
  return {
    accessToken: resp.accessToken,
    accessExpiresIn: resp.accessExpiresIn,
    role: resp.role,
    sessionId: resp.sessionId,
    steamId: resp.steamId,
  };
}

export function authSessionFromAccessToken(resp: AccessTokenResponse): AuthSession {
  const payload = tokenManager.decodeToken(resp.accessToken);
  const sessionId =
    (payload && typeof payload.sub === 'string' ? payload.sub : null) ?? tokenManager.getSessionId() ?? '';
  const role = payload && typeof payload.role === 'string' ? payload.role : 'GUEST';
  const steamIdRaw = payload ? (payload as any).steamId : undefined;
  const steamId = steamIdRaw == null ? undefined : Number(steamIdRaw);

  return {
    accessToken: resp.accessToken,
    accessExpiresIn: resp.accessExpiresIn,
    role,
    sessionId,
    steamId: Number.isFinite(steamId) ? steamId : undefined,
  };
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

  async refresh(): Promise<AccessTokenResponse> {
    try {
      const response = await axios.post<AccessTokenResponse>(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
      return response.data;
    } catch (error) {
      console.error('Error during token refresh:', error);
      throw new Error('Failed to refresh token');
    }
  }
};

export interface GamesProceedRequest {
  content: string;
  tags: string[];
  steamId?: string | null;
}

export interface GamesProceedResponse {
  recommendation: string;
  success: boolean;
  recommendations: GameRecommendation[];
}

export const gamesApi = {
  async proceed(request: GamesProceedRequest): Promise<GamesProceedResponse> {
    try {
      const response = await api.post<GamesProceedResponse>('/games/proceed', request, {
        // AI calls can take >10s; allow enough time for a full response.
        timeout: 60000,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching game recommendations:', error);
      throw new Error('Failed to get game recommendations');
    }
  }
};

export default api;


