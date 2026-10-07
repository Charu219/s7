const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');
const { registerFcmToken, removeFcmToken } = require('../controllers/fcmTokenController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getNotifications);
router.put('/read-all', protect, markAllAsRead);
router.put('/:id/read', protect, markAsRead);

// FCM token management
router.post('/fcm-token', protect, registerFcmToken);
router.delete('/fcm-token', protect, removeFcmToken);

module.exports = router;

