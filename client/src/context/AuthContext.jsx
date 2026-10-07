import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('hb_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const [donor, setDonor] = useState(() => {
    try {
      const stored = localStorage.getItem('hb_donor');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const [token, setToken] = useState(() => localStorage.getItem('hb_token'));
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const verify = async () => {
      const storedToken = localStorage.getItem('hb_token');
      if (!storedToken) { setLoading(false); return; }
      try {
        const res = await authApi.getMe();
        setUser(res.data.user);
        setDonor(res.data.donor || null);
        localStorage.setItem('hb_user', JSON.stringify(res.data.user));
        if (res.data.donor) localStorage.setItem('hb_donor', JSON.stringify(res.data.donor));
      } catch {
        localStorage.removeItem('hb_token');
        localStorage.removeItem('hb_user');
        localStorage.removeItem('hb_donor');
        setUser(null);
        setDonor(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    const { token: t, user: u, donor: d } = res.data;
    localStorage.setItem('hb_token', t);
    localStorage.setItem('hb_user', JSON.stringify(u));
    if (d) localStorage.setItem('hb_donor', JSON.stringify(d));
    setToken(t);
    setUser(u);
    setDonor(d || null);
    return res.data;
  }, []);

  const register = useCallback(async (formData) => {
    const res = await authApi.register(formData);
    const { token: t, user: u } = res.data;
    localStorage.setItem('hb_token', t);
    localStorage.setItem('hb_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    // Remove FCM token from backend before clearing credentials
    try {
      const fcmToken = localStorage.getItem('hb_fcm_token');
      if (fcmToken) {
        const { removeFcmToken } = await import('../api/notifications');
        await removeFcmToken(fcmToken).catch(() => {});
        localStorage.removeItem('hb_fcm_token');
      }
    } catch { /* ignore push cleanup errors */ }

    localStorage.removeItem('hb_token');
    localStorage.removeItem('hb_user');
    localStorage.removeItem('hb_donor');
    setToken(null);
    setUser(null);
    setDonor(null);
    window.location.href = '/login';
  }, []);

  const refreshDonor = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      setDonor(res.data.donor || null);
      if (res.data.donor) localStorage.setItem('hb_donor', JSON.stringify(res.data.donor));
    } catch { /* ignore */ }
  }, []);

  const value = {
    user, donor, token, loading,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.role === 'ADMIN',
    isDonor: user?.role === 'DONOR',
    isRecipient: user?.role === 'RECIPIENT',
    login, register, logout, refreshDonor,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
