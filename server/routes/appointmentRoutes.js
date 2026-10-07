const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { createAppointment, getAppointments, updateAppointment, deleteAppointment } = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.get('/', protect, authorize('ADMIN', 'DONOR'), getAppointments);
router.post('/', protect, authorize('ADMIN'), [
  body('donorId').notEmpty().withMessage('Donor is required.'),
  body('type').isIn(['MONTHLY_HEALTH_CHECK', 'DOCTOR_CONSULTATION']).withMessage('Invalid appointment type.'),
  body('date').isISO8601().withMessage('Please enter a valid date.'),
  body('time').notEmpty().withMessage('Time is required.'),
  body('hospital').notEmpty().withMessage('Hospital is required.'),
  body('reason').notEmpty().withMessage('Reason is required.'),
], validate, createAppointment);
router.put('/:id', protect, authorize('ADMIN'), updateAppointment);
router.delete('/:id', protect, authorize('ADMIN'), deleteAppointment);

module.exports = router;
