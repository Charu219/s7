/**
 * firebase-messaging-sw.js
 *
 * Firebase Cloud Messaging Service Worker.
 * MUST be in /public (served from root scope: /).
 *
 * This handles background push notifications when HealthBridge is NOT focused.
 *
 * Firebase config is injected at runtime via a postMessage from the main app
 * (because service workers can't access Vite env vars).
 */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

let messagingInitialized = false;

/**
 * Initialise Firebase with the provided config object.
 * Called once when the main app posts the FIREBASE_CONFIG message.
 */
function initFirebaseMessaging(config) {
  if (messagingInitialized) return;
  if (!config || !config.apiKey || !config.projectId || !config.messagingSenderId) {
    console.warn('[SW] Invalid Firebase config — background push disabled.');
    return;
  }

  try {
    firebase.initializeApp(config);
    const messaging = firebase.messaging();
    messagingInitialized = true;

    // ── Background message handler ───────────────────────────────────────────
    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Background push received:', payload);

      const { notification, data } = payload;
      const title    = (notification && notification.title) || (data && data.title) || 'HealthBridge';
      const body     = (notification && notification.body)  || (data && data.body)  || 'You have a new notification.';
      const clickUrl = (data && data.clickUrl) || '/';
      const type     = (data && data.type) || 'GENERAL';

      const options = {
        body,
        icon:             '/favicon.svg',
        badge:            '/favicon.svg',
        tag:              type,           // collapses duplicate same-type notifications
        renotify:         true,
        requireInteraction: false,
        data:             { clickUrl },
        actions: [
          { action: 'open',    title: 'View' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      };

      self.registration.showNotification(title, options);
    });

    console.log('[SW] Firebase Messaging initialized successfully.');
  } catch (err) {
    console.error('[SW] Firebase init error:', err);
  }
}

// ── Receive config from main app via postMessage ─────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    initFirebaseMessaging(event.data.config);
  }
});

// ── Notification click handler ───────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const clickUrl = (event.notification.data && event.notification.data.clickUrl) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Try to focus an existing HealthBridge window
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.indexOf(self.location.origin) === 0 && 'focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(clickUrl);
          return;
        }
      }
      // No existing window — open new one
      if (clients.openWindow) {
        return clients.openWindow(clickUrl);
      }
    })
  );
});
