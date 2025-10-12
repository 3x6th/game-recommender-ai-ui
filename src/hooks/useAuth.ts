import { useState, useEffect } from 'react';
import { authApi, PreAuthResponse } from '../services/api';

export const useAuth = () => {
  const [authData, setAuthData] = useState<PreAuthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const preAuthorize = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await authApi.preAuthorize();
        setAuthData(response);

        // Store token in localStorage for persistence
        if (response.accessToken) {
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('sessionId', response.sessionId);
        }
      } catch (err) {
        console.error('Pre-authorization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to authorize');
      } finally {
        setIsLoading(false);
      }
    };

    preAuthorize();
  }, []);

  return {
    authData,
    isLoading,
    error,
    isAuthenticated: !!authData?.accessToken,
  };
};
