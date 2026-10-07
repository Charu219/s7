/**
 * Firebase Client SDK — Messaging only.
 * All config values come from VITE_ environment variables.
 * Never put private keys here.
 */
import { initializeApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

let app = null;
let messaging = null;

/**
 * Lazy-initialise Firebase app and messaging.
 * Returns null if config is missing or browser does not support FCM.
 */
export const getFirebaseMessaging = async () => {
  // Already initialised
  if (messaging) return messaging;

  // Check required config keys are present
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.messagingSenderId) {
    console.warn(
      '⚠️  Firebase not configured — push notifications disabled.\n' +
      '   Set VITE_FIREBASE_* environment variables in client/.env'
    );
    return null;
  }

  // Check browser support for FCM
  const supported = await isSupported().catch(() => false);
  if (!supported) {
    console.warn('⚠️  This browser does not support Firebase Cloud Messaging.');
    return null;
  }

  try {
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    return messaging;
  } catch (err) {
    console.error('Firebase init error:', err);
    return null;
  }
};

export { firebaseConfig };
