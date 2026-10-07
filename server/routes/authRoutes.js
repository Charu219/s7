const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, getMe, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Full name is required.'),
  body('email').isEmail().withMessage('Please enter a valid email address.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('role').isIn(['DONOR', 'RECIPIENT']).withMessage('Role must be DONOR or RECIPIENT.'),
  body('phone').notEmpty().withMessage('Phone number is required.'),
];

router.post('/register', registerValidation, validate, register);
router.post('/login', [
  body('email').isEmail().withMessage('Please enter a valid email.'),
  body('password').notEmpty().withMessage('Password is required.'),
], validate, login);
router.get('/me', protect, getMe);
router.put('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters.'),
], validate, changePassword);

module.exports = router;
