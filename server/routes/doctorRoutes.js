const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { getDoctors, createDoctor, updateDoctor, deleteDoctor } = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const doctorValidation = [
  body('name').trim().notEmpty().withMessage('Doctor name is required.'),
  body('specialization').notEmpty().withMessage('Specialization is required.'),
  body('hospital').notEmpty().withMessage('Hospital is required.'),
  body('phone').notEmpty().withMessage('Phone is required.'),
];

router.get('/', protect, authorize('ADMIN'), getDoctors);
router.post('/', protect, authorize('ADMIN'), doctorValidation, validate, createDoctor);
router.put('/:id', protect, authorize('ADMIN'), updateDoctor);
router.delete('/:id', protect, authorize('ADMIN'), deleteDoctor);

module.exports = router;
