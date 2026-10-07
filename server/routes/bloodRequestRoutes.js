const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createBloodRequest, getBloodRequests, getBloodRequestById,
  respondToBloodRequest, updateBloodRequest, getRequestResponses, deleteBloodRequest,
} = require('../controllers/bloodRequestController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const requestValidation = [
  body('patientName').trim().notEmpty().withMessage('Patient name is required.'),
  body('patientAge').isInt({ min: 0, max: 120 }).withMessage('Please enter a valid patient age.'),
  body('bloodGroup').isIn(['A+','A-','B+','B-','AB+','AB-','O+','O-']).withMessage('Please select a valid blood group.'),
  body('unitsRequired').isInt({ min: 1, max: 20 }).withMessage('Units required must be between 1 and 20.'),
  body('urgency').isIn(['EMERGENCY','URGENT','NORMAL']).withMessage('Please select urgency level.'),
  body('requiredDate').isISO8601().withMessage('Please enter a valid required date.'),
  body('hospitalName').trim().notEmpty().withMessage('Hospital name is required.'),
  body('hospitalLocation').trim().notEmpty().withMessage('Hospital location is required.'),
  body('hospitalContact').trim().notEmpty().withMessage('Hospital contact is required.'),
];

router.post('/', protect, authorize('RECIPIENT'), requestValidation, validate, createBloodRequest);
router.get('/', protect, authorize('ADMIN', 'RECIPIENT', 'DONOR'), getBloodRequests);
router.get('/:id', protect, authorize('ADMIN', 'RECIPIENT', 'DONOR'), getBloodRequestById);
router.put('/:id', protect, authorize('ADMIN'), updateBloodRequest);
router.delete('/:id', protect, authorize('ADMIN'), deleteBloodRequest);
router.post('/:id/respond', protect, authorize('DONOR'), [
  body('response').isIn(['ACCEPTED', 'DECLINED']).withMessage('Response must be ACCEPTED or DECLINED.'),
], validate, respondToBloodRequest);
router.get('/:id/responses', protect, authorize('ADMIN'), getRequestResponses);

module.exports = router;
