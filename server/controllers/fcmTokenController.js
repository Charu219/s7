const User = require('../models/User');

const MAX_TOKENS_PER_USER = 10; // limit stored tokens to avoid unbounded growth

/**
 * POST /api/notifications/fcm-token
 * Register or refresh an FCM token for the authenticated user.
 */
const registerFcmToken = async (req, res, next) => {
  try {
    const { token, device = 'web' } = req.body;

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'FCM token is required.' });
    }

    const user = await User.findById(req.user._id);

    // Remove any existing entry for this exact token (avoid duplicates)
    user.fcmTokens = user.fcmTokens.filter((t) => t.token !== token);

    // Prepend new token
    user.fcmTokens.unshift({ token, device, registeredAt: new Date() });

    // Keep only the most recent MAX_TOKENS_PER_USER tokens
    if (user.fcmTokens.length > MAX_TOKENS_PER_USER) {
      user.fcmTokens = user.fcmTokens.slice(0, MAX_TOKENS_PER_USER);
    }

    await user.save();

    res.status(200).json({ success: true, message: 'FCM token registered.' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/notifications/fcm-token
 * Remove an FCM token on logout or permission revocation.
 */
const removeFcmToken = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'FCM token is required.' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { fcmTokens: { token } },
    });

    res.status(200).json({ success: true, message: 'FCM token removed.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerFcmToken, removeFcmToken };
