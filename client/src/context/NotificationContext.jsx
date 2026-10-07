import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getNotifications, markAsRead as markAsReadApi, markAllRead } from '../api/notifications';
import { useAuth } from './AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

const NotificationContext = createContext(null);

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await getNotifications();
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // silently fail — don't disrupt the UI
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Initial fetch + polling
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();

    // Poll every 30s for new notifications
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [isAuthenticated, fetchNotifications]);

  // ─── FCM Push Notifications ─────────────────────────────────────────────────
  // When a push arrives in the foreground, immediately refresh the bell count.
  usePushNotifications(isAuthenticated, fetchNotifications);

  const markOneAsRead = useCallback(async (id) => {
    try {
      await markAsReadApi(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      markOneAsRead,
      markAllAsRead,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
