const ACCESS_TOKEN_KEY = 'accessToken';
const SESSION_ID_KEY = 'sessionId';
const EXPIRES_AT_KEY = 'tokenExpiresAt';

function base64UrlToBase64(input: string): string {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = base64.length % 4;
  if (padLength) {
    base64 += '='.repeat(4 - padLength);
  }
  return base64;
}

class TokenManager {
  /**
   * Set tokens in localStorage
   */
  setTokens(data: { accessToken: string; sessionId: string; expiresIn?: number }): void {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      localStorage.setItem(SESSION_ID_KEY, data.sessionId);

      if (data.expiresIn) {
        const expiresAt = Date.now() + data.expiresIn * 1000;
        localStorage.setItem(EXPIRES_AT_KEY, expiresAt.toString());
      }
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  /**
   * Get access token from localStorage
   */
  getAccessToken(): string | null {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve access token:', error);
      return null;
    }
  }

  /**
   * Get session ID from localStorage
   */
  getSessionId(): string | null {
    try {
      return localStorage.getItem(SESSION_ID_KEY);
    } catch (error) {
      console.error('Failed to retrieve session ID:', error);
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  getExpiresAt(): number | null {
    try {
      const expiresAt = localStorage.getItem(EXPIRES_AT_KEY);
      return expiresAt ? parseInt(expiresAt, 10) : null;
    } catch (error) {
      console.error('Failed to retrieve token expiration:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    const expiresAt = this.getExpiresAt();
    if (!expiresAt) {
      // If we don't have expiration info, assume token might be valid
      return false;
    }

    // Add 5-second buffer to account for network latency
    return Date.now() >= expiresAt - 5000;
  }

  /**
   * Get time until token expires (in milliseconds)
   */
  getTimeUntilExpiration(): number | null {
    const expiresAt = this.getExpiresAt();
    if (!expiresAt) return null;

    const timeLeft = expiresAt - Date.now();
    return Math.max(0, timeLeft);
  }

  /**
   * Check if token exists
   */
  hasToken(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Clear all tokens from localStorage
   */
  clearTokens(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(SESSION_ID_KEY);
      localStorage.removeItem(EXPIRES_AT_KEY);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Validate token format (basic JWT structure check)
   */
  isValidTokenFormat(token: string): boolean {
    if (!token) return false;

    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Each part should be base64 encoded
    try {
      parts.forEach(part => {
        atob(base64UrlToBase64(part));
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Decode JWT payload (without verification)
   */
  decodeToken<T = any>(token: string): T | null {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(base64UrlToBase64(payload));
      return JSON.parse(decoded) as T;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Get token info including decoded payload
   */
  getTokenInfo(): { token: string; payload: any; expiresAt: number | null } | null {
    const token = this.getAccessToken();
    if (!token) return null;

    return {
      token,
      payload: this.decodeToken(token),
      expiresAt: this.getExpiresAt(),
    };
  }
}

export const tokenManager = new TokenManager();
