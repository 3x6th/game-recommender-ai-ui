import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AuthSession, authApi, authSessionFromAccessToken, authSessionFromPreAuth } from '../services/api';
import { tokenManager } from '../utils/tokenManager';

interface AuthContextType {
  authData: AuthSession | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (authSession: AuthSession) => void;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authData, setAuthData] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTokenRef = useRef<() => Promise<boolean>>(async () => false);

  const getValidStoredSession = useCallback((): AuthSession | null => {
    const accessToken = tokenManager.getAccessToken();
    if (!accessToken || !tokenManager.isValidTokenFormat(accessToken)) {
      return null;
    }

    const payload = tokenManager.decodeToken<{
      exp?: number;
      sub?: string;
      role?: string;
      steamId?: number | string;
    }>(accessToken);

    if (!payload || typeof payload.exp !== 'number') {
      return null;
    }

    const expiresAtMs = payload.exp * 1000;
    // Keep a small safety buffer so we do not race token expiry.
    if (Date.now() >= expiresAtMs - 5000) {
      return null;
    }

    const accessExpiresIn = Math.max(1, Math.floor((expiresAtMs - Date.now()) / 1000));
    const sessionId =
      typeof payload.sub === 'string' && payload.sub.trim().length > 0
        ? payload.sub
        : tokenManager.getSessionId() ?? '';

    if (!sessionId) {
      return null;
    }

    const role = typeof payload.role === 'string' ? payload.role : 'GUEST';
    const steamIdValue = payload.steamId == null ? undefined : Number(payload.steamId);

    return {
      accessToken,
      accessExpiresIn,
      role,
      sessionId,
      steamId: Number.isFinite(steamIdValue) ? steamIdValue : undefined,
    };
  }, []);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const clearAuth = useCallback(() => {
    clearRefreshTimer();
    tokenManager.clearTokens();
    setAuthData(null);
  }, [clearRefreshTimer]);

  const scheduleTokenRefresh = useCallback((expiresIn: number) => {
    clearRefreshTimer();

    // Refresh token 1 minute before it expires (or at 80% of lifetime if shorter)
    const refreshTime = Math.max(expiresIn * 1000 * 0.8, expiresIn * 1000 - 60000);

    refreshTimerRef.current = setTimeout(() => {
      void refreshTokenRef.current();
    }, refreshTime);
  }, [clearRefreshTimer]);

  const login = useCallback((session: AuthSession) => {
    setAuthData(session);
    setError(null);

    if (session.accessToken) {
      tokenManager.setTokens({
        accessToken: session.accessToken,
        sessionId: session.sessionId,
        expiresIn: session.accessExpiresIn,
      });

      // Schedule automatic refresh
      if (session.accessExpiresIn) {
        scheduleTokenRefresh(session.accessExpiresIn);
      }
    }
  }, [scheduleTokenRefresh]);

  const logout = useCallback(() => {
    setError(null);
    clearAuth();

    // Start a new guest session for rate limiting / continuity (new sessionId).
    void authApi
      .preAuthorize()
      .then((resp) => login(authSessionFromPreAuth(resp)))
      .catch((err) => {
        console.error('Failed to pre-authorize after logout:', err);
        setError('Failed to authorize');
      });
  }, [clearAuth, login]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await authApi.refresh();

      if (response.accessToken) {
        login(authSessionFromAccessToken(response));
        return true;
      }

      return false;
    } catch (err) {
      console.error('Token refresh failed, trying pre-authorization...', err);

      // If refresh fails, try pre-authorize as fallback
      try {
        const preAuthResponse = await authApi.preAuthorize();
        if (preAuthResponse.accessToken) {
          login(authSessionFromPreAuth(preAuthResponse));
          return true;
        }
      } catch (preAuthError) {
        console.error('Pre-authorization also failed:', preAuthError);
      }

      setError(err instanceof Error ? err.message : 'Failed to authorize');
      clearAuth();
      return false;
    }
  }, [clearAuth, login]);

  useEffect(() => {
    refreshTokenRef.current = refreshToken;
  }, [refreshToken]);

  // Initialize auth on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const storedSession = getValidStoredSession();
        if (storedSession) {
          login(storedSession);
          return;
        }

        // Prefer refresh() to restore session from cookie (works after Steam redirect too).
        const refreshed = await refreshToken();
        if (!refreshed) {
          const response = await authApi.preAuthorize();
          login(authSessionFromPreAuth(response));
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to authorize');
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      clearRefreshTimer();
    };
  }, [clearRefreshTimer, getValidStoredSession, login, refreshToken]);

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
