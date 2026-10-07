const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getAllDonors, getDonorById, getMyDonorProfile, updateDonor, deleteDonor,
  submitQuestionnaire, getHealthReports, getDonationHistory, getDonorAppointments,
} = require('../controllers/donorController');
const { createHealthReport } = require('../controllers/healthReportController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const questionnaireValidation = [
  body('height').isFloat({ min: 50, max: 300 }).withMessage('Please enter a valid height (50–300 cm).'),
  body('weight').isFloat({ min: 20, max: 300 }).withMessage('Please enter a valid weight (20–300 kg).'),
];

// Admin only
router.get('/', protect, authorize('ADMIN'), getAllDonors);
router.delete('/:id', protect, authorize('ADMIN'), deleteDonor);

// Donor profile
router.get('/me', protect, authorize('DONOR'), getMyDonorProfile);

// Questionnaire – donor only, once
router.post('/questionnaire', protect, authorize('DONOR'), questionnaireValidation, validate, submitQuestionnaire);

// Admin or own donor
router.get('/:id', protect, authorize('ADMIN', 'DONOR'), getDonorById);
router.put('/:id', protect, authorize('ADMIN', 'DONOR'), updateDonor);
router.get('/:id/health-reports', protect, authorize('ADMIN', 'DONOR'), getHealthReports);
router.get('/:id/donations', protect, authorize('ADMIN', 'DONOR'), getDonationHistory);
router.get('/:id/appointments', protect, authorize('ADMIN', 'DONOR'), getDonorAppointments);

// Admin: create health report
router.post('/:id/health-reports', protect, authorize('ADMIN'), [
  body('donorId').notEmpty(),
  body('systolicBP').isFloat({ min: 60, max: 250 }).withMessage('Please enter a valid systolic BP.'),
  body('diastolicBP').isFloat({ min: 40, max: 180 }).withMessage('Please enter a valid diastolic BP.'),
  body('hemoglobin').isFloat({ min: 3, max: 25 }).withMessage('Please enter a valid hemoglobin value.'),
  body('pulse').isFloat({ min: 20, max: 250 }).withMessage('Please enter a valid pulse.'),
  body('weight').isFloat({ min: 20, max: 300 }).withMessage('Please enter a valid weight.'),
  body('height').isFloat({ min: 50, max: 300 }).withMessage('Please enter a valid height.'),
], validate, (req, res, next) => {
  req.body.donorId = req.params.id;
  next();
}, createHealthReport);

module.exports = router;
