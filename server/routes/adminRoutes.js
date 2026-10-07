const express = require('express');
const router = express.Router();
const { getPublicStats, getAnalytics, getAllRecipients, getHealthMonitoring } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

// Public – for landing page stats
router.get('/stats', getPublicStats);

// Admin only
router.get('/analytics', protect, authorize('ADMIN'), getAnalytics);
router.get('/recipients', protect, authorize('ADMIN'), getAllRecipients);
router.get('/health-monitoring', protect, authorize('ADMIN'), getHealthMonitoring);

module.exports = router;
