import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { PreAuthResponse, authApi } from '../services/api';
import { tokenManager } from '../utils/tokenManager';

interface AuthContextType {
  authData: PreAuthResponse | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (authResponse: PreAuthResponse) => void;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authData, setAuthData] = useState<PreAuthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleTokenRefresh = useCallback((expiresIn: number) => {
    clearRefreshTimer();

    // Refresh token 1 minute before it expires (or at 80% of lifetime if shorter)
    const refreshTime = Math.max(expiresIn * 1000 * 0.8, expiresIn * 1000 - 60000);

    refreshTimerRef.current = setTimeout(() => {
      refreshToken();
    }, refreshTime);
  }, [clearRefreshTimer]);

  const login = useCallback((authResponse: PreAuthResponse) => {
    setAuthData(authResponse);
    setError(null);

    if (authResponse.accessToken) {
      tokenManager.setTokens({
        accessToken: authResponse.accessToken,
        sessionId: authResponse.sessionId,
      });

      // Schedule automatic refresh
      if (authResponse.accessExpiresIn) {
        scheduleTokenRefresh(authResponse.accessExpiresIn);
      }
    }
  }, [scheduleTokenRefresh]);

  const logout = useCallback(() => {
    clearRefreshTimer();
    tokenManager.clearTokens();
    setAuthData(null);
    setError(null);
  }, [clearRefreshTimer]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await authApi.refresh();

      if (response.accessToken) {
        login(response);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Token refresh failed:', err);
      logout();
      return false;
    }
  }, [login, logout]);

  // Initialize auth on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if we have a stored token
        const storedToken = tokenManager.getAccessToken();

        if (storedToken && !tokenManager.isTokenExpired()) {
          // Try to refresh to validate the token
          const refreshed = await refreshToken();

          if (!refreshed) {
            // If refresh fails, try pre-authorize
            const response = await authApi.preAuthorize();
            login(response);
          }
        } else {
          // No valid token, pre-authorize
          const response = await authApi.preAuthorize();
          login(response);
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to authorize');
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      clearRefreshTimer();
    };
  }, []);

  const value: AuthContextType = {
    authData,
    isLoading,
    error,
    isAuthenticated: !!authData?.accessToken,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
