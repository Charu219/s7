/**
 * FCM Push Notification Service
 *
 * Sends push notifications via Firebase Cloud Messaging.
 * Gracefully degrades (no-op) when Firebase is not configured.
 */

const { initializeFirebase, admin, isFirebaseReady } = require('../config/firebase');
const User = require('../models/User');

// Initialize Firebase Admin on service load
initializeFirebase();

/**
 * Map notification type → click-action URL (frontend route)
 */
const getClickUrl = (type, relatedModel, relatedId) => {
  const base = process.env.CLIENT_URL || 'http://localhost:5173';
  switch (type) {
    case 'BLOOD_REQUEST':
    case 'REQUEST_ACCEPTED':
    case 'CONTACT_SHARED':
    case 'DONATION_COMPLETED':
      // Distinguish donor vs recipient — we pick the more specific one at call site
      return `${base}/donor/blood-requests`;
    case 'APPOINTMENT':
      return `${base}/donor/appointments`;
    case 'HEALTH_REPORT':
    case 'HEALTH_CHECK_REMINDER':
      return `${base}/donor/health-reports`;
    case 'STATUS_CHANGE':
      return `${base}/donor/dashboard`;
    case 'REGISTRATION':
    case 'QUESTIONNAIRE_REMINDER':
      return `${base}/donor/questionnaire`;
    default:
      return base;
  }
};

/**
 * Send a single FCM push notification to a user.
 *
 * @param {object} opts
 * @param {string|ObjectId} opts.userId         - MongoDB User._id
 * @param {string}          opts.title          - Notification title
 * @param {string}          opts.body           - Notification body / message
 * @param {string}          [opts.type]         - Notification type enum
 * @param {string}          [opts.relatedModel] - e.g. 'BloodRequest', 'Appointment'
 * @param {string}          [opts.relatedId]    - MongoDB ObjectId of the related doc
 * @param {string}          [opts.clickUrl]     - Override click/navigation URL
 * @param {object}          [opts.data]         - Extra key-value string data for SW
 */
const sendPushToUser = async ({
  userId,
  title,
  body,
  type = 'GENERAL',
  relatedModel = null,
  relatedId = null,
  clickUrl = null,
  data = {},
}) => {
  try {
    // Check Firebase is available
    if (!isFirebaseReady()) return;

    const messaging = admin.messaging();

    // Fetch user's FCM tokens
    const user = await User.findById(userId).select('fcmTokens').lean();
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) return;

    const url = clickUrl || getClickUrl(type, relatedModel, relatedId);

    const baseData = {
      type,
      clickUrl: url,
      relatedModel: relatedModel || '',
      relatedId: relatedId ? relatedId.toString() : '',
      ...data,
    };

    const validTokens = user.fcmTokens.map((t) => t.token).filter(Boolean);
    if (validTokens.length === 0) return;

    // Send to all registered tokens for this user
    const message = {
      notification: { title, body },
      data: baseData,
      webpush: {
        notification: {
          title,
          body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          click_action: url,
        },
        fcmOptions: { link: url },
      },
      tokens: validTokens,
    };

    const response = await messaging.sendEachForMulticast(message);

    // Clean up invalid/expired tokens
    if (response.failureCount > 0) {
      const tokensToRemove = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (
            errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/registration-token-not-registered' ||
            errCode === 'messaging/invalid-argument'
          ) {
            tokensToRemove.push(validTokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        await User.findByIdAndUpdate(userId, {
          $pull: { fcmTokens: { token: { $in: tokensToRemove } } },
        });
      }
    }
  } catch (error) {
    // Never let push notification failures break the main flow
    console.error('FCM sendPushToUser error:', error.message);
  }
};

/**
 * Send push notifications to multiple users at once.
 *
 * @param {Array<object>} notifications - Array of objects with same shape as sendPushToUser opts
 */
const sendBulkPushNotifications = async (notifications) => {
  try {
    await Promise.allSettled(notifications.map((n) => sendPushToUser(n)));
  } catch (error) {
    console.error('FCM sendBulkPushNotifications error:', error.message);
  }
};

module.exports = { sendPushToUser, sendBulkPushNotifications };
