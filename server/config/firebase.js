const admin = require('firebase-admin');

/**
 * Initialize Firebase Admin SDK once.
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON env var containing the full
 * service-account JSON (as a single-line string), OR individual vars.
 */
const initializeFirebase = () => {
  // Already initialized — don't re-init
  if (admin.apps?.length > 0) return admin;

  // Option A: Full service-account JSON in one env var (recommended)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin initialized (from FIREBASE_SERVICE_ACCOUNT_JSON)');
      return admin;
    } catch (err) {
      console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', err.message);
    }
  }

  // Option B: Individual environment variables
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    console.log('✅ Firebase Admin initialized (from individual env vars)');
    return admin;
  }

  console.warn(
    '⚠️  Firebase Admin NOT initialized — push notifications disabled.\n' +
    '   Set FIREBASE_SERVICE_ACCOUNT_JSON or individual FIREBASE_* env vars.'
  );
  return null;
};

/**
 * Returns true only if Firebase Admin is initialized and ready.
 */
const isFirebaseReady = () => (admin.apps?.length ?? 0) > 0;

module.exports = { initializeFirebase, admin, isFirebaseReady };
