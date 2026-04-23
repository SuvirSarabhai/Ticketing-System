import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, parseResponse, setAccessToken, clearTokens } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true while restoring session

  // ── Session restore on mount ────────────────────────────────────────────────
  // Try to get a new access token using the stored refresh token
  useEffect(() => {
    const restoreSession = async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/token/refresh', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
          clearTokens();
          setLoading(false);
          return;
        }

        const { accessToken } = await res.json();
        setAccessToken(accessToken);

        // Fetch current user profile
        const meRes  = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (meRes.ok) {
          const { user: me } = await meRes.json();
          setUser(me);
        } else {
          clearTokens();
        }
      } catch {
        clearTokens();
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // ── login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res  = await api.post('/api/auth/login', { email, password });
    const data = await parseResponse(res); // throws on error

    setAccessToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);

    return data.user;
  }, []);

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout', {});
    } catch {
      // best-effort — clear locally regardless
    }
    clearTokens();
    setUser(null);
  }, []);

  // ── forgotPassword ─────────────────────────────────────────────────────────
  const forgotPassword = useCallback(async (email) => {
    const res = await api.post('/api/auth/forgot-password', { email });
    return parseResponse(res);
  }, []);

  // ── resetPassword ──────────────────────────────────────────────────────────
  const resetPassword = useCallback(async (email, token, newPassword) => {
    const res = await api.post('/api/auth/reset-password', { email, token, newPassword });
    return parseResponse(res);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    forgotPassword,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
