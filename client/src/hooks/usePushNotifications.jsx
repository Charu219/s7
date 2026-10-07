/**
 * usePushNotifications — React hook
 *
 * Responsibilities:
 *  1. Request browser notification permission (once, non-intrusively)
 *  2. Obtain the FCM registration token
 *  3. Inject Firebase config into the service worker
 *  4. Register the service worker at the correct scope
 *  5. POST the token to the HealthBridge backend (/api/notifications/fcm-token)
 *  6. Handle foreground push messages (toast notifications)
 *  7. Refresh in-app notification list when a push arrives
 *  8. Clean up on logout
 */
import { useEffect, useRef, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import toast from 'react-hot-toast';
import { getFirebaseMessaging, firebaseConfig } from '../firebase';
import api from '../api/axios';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const LS_PERMISSION_ASKED = 'hb_push_permission_asked';
const LS_FCM_TOKEN = 'hb_fcm_token';

/**
 * Register the FCM token with the HealthBridge backend.
 */
const saveFcmTokenToBackend = async (token) => {
  try {
    await api.post('/notifications/fcm-token', { token, device: 'web' });
  } catch (err) {
    console.warn('Failed to save FCM token to backend:', err.message);
  }
};

/**
 * Remove the FCM token from the backend (called on logout).
 */
export const removeFcmTokenFromBackend = async (token) => {
  try {
    await api.delete('/notifications/fcm-token', { data: { token } });
  } catch {
    // ignore — user is logging out anyway
  }
};

/**
 * Inject Firebase config into the service worker so it can initialise Firebase
 * without Vite env vars (service workers don't have access to those).
 */
const injectConfigIntoSW = async (swRegistration) => {
  if (!swRegistration?.active) return;
  swRegistration.active.postMessage({
    type: 'FIREBASE_CONFIG',
    config: firebaseConfig,
  });
};

/**
 * usePushNotifications(isAuthenticated, onNewNotification)
 *
 * @param {boolean}  isAuthenticated     - from AuthContext
 * @param {Function} onNewNotification   - callback to refresh the notification bell
 */
export function usePushNotifications(isAuthenticated, onNewNotification) {
  const unsubscribeRef = useRef(null);
  const swRegRef = useRef(null);

  /**
   * Core initialisation — runs after login.
   */
  const initPush = useCallback(async () => {
    // Prerequisites
    if (!isAuthenticated) return;
    if (!('Notification' in window)) {
      console.warn('Browser does not support desktop notifications.');
      return;
    }
    if (!('serviceWorker' in navigator)) {
      console.warn('Browser does not support service workers.');
      return;
    }

    // Request permission — only ask once per browser session
    let permission = Notification.permission;
    if (permission === 'default') {
      // Only prompt if we haven't prompted this browser before
      // (we track this so we don't keep asking on every page load)
      const alreadyAsked = localStorage.getItem(LS_PERMISSION_ASKED);
      if (!alreadyAsked) {
        localStorage.setItem(LS_PERMISSION_ASKED, '1');
        permission = await Notification.requestPermission();
      }
    }

    if (permission !== 'granted') {
      console.info('Push notification permission:', permission);
      return;
    }

    // Initialise Firebase Messaging
    const messagingInstance = await getFirebaseMessaging();
    if (!messagingInstance) return; // not configured or unsupported

    try {
      // Register (or reuse) the FCM service worker
      let swReg = swRegRef.current;
      if (!swReg) {
        swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
        });
        swRegRef.current = swReg;
        await navigator.serviceWorker.ready;
      }

      // Inject Firebase config into the SW (it can't read Vite env vars)
      // Use a BroadcastChannel approach via postMessage to the SW
      if (swReg.active) {
        swReg.active.postMessage({
          type: 'FIREBASE_CONFIG',
          config: firebaseConfig,
        });
      }

      // Get FCM registration token
      const token = await getToken(messagingInstance, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });

      if (!token) {
        console.warn('FCM token generation failed — no token returned.');
        return;
      }

      // Save to backend only if it changed
      const storedToken = localStorage.getItem(LS_FCM_TOKEN);
      if (token !== storedToken) {
        await saveFcmTokenToBackend(token);
        localStorage.setItem(LS_FCM_TOKEN, token);
      }

      // Listen for foreground messages (app is in focus)
      if (unsubscribeRef.current) unsubscribeRef.current(); // clean up previous
      unsubscribeRef.current = onMessage(messagingInstance, (payload) => {
        const title = payload.notification?.title || payload.data?.title || 'HealthBridge';
        const body  = payload.notification?.body  || payload.data?.body  || 'You have a new notification.';
        const clickUrl = payload.data?.clickUrl;

        // Show a toast in-app with a link
        toast(
          (t) => (
            <div
              onClick={() => {
                toast.dismiss(t.id);
                if (clickUrl) window.location.href = clickUrl;
              }}
              style={{ cursor: clickUrl ? 'pointer' : 'default' }}
            >
              <strong style={{ display: 'block', marginBottom: '2px' }}>{title}</strong>
              <span style={{ fontSize: '0.8125rem', opacity: 0.85 }}>{body}</span>
            </div>
          ),
          { duration: 6000, icon: '🔔' }
        );

        // Refresh the in-app notification bell
        if (typeof onNewNotification === 'function') {
          onNewNotification();
        }
      });
    } catch (err) {
      // Never throw — push is a nice-to-have, not critical
      console.warn('Push notification init error:', err.message);
    }
  }, [isAuthenticated, onNewNotification]);

  /**
   * Cleanup — runs on logout or unmount.
   */
  const cleanupPush = useCallback(async () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    const token = localStorage.getItem(LS_FCM_TOKEN);
    if (token) {
      await removeFcmTokenFromBackend(token);
      localStorage.removeItem(LS_FCM_TOKEN);
    }
  }, []);

  // Run on auth state change
  useEffect(() => {
    if (isAuthenticated) {
      initPush();
    } else {
      cleanupPush();
    }
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [isAuthenticated, initPush, cleanupPush]);

  return { initPush, cleanupPush };
}
