const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, getMe, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

// ─── Reusable regex patterns ────────────────────────────────────────────────
// Only @gmail.com addresses are accepted for self-registration
const GMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@gmail\.com$/;

// 10-digit Indian mobile: must start with 6, 7, 8, or 9
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

// Strong password: ≥8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~])[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]{8,}$/;

const STRONG_PASSWORD_MSG =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.';

// ─── Registration validation ─────────────────────────────────────────────────
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required.'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required.')
    .matches(GMAIL_REGEX)
    .withMessage('Please enter a valid Gmail address ending with @gmail.com.'),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required.')
    .matches(INDIAN_PHONE_REGEX)
    .withMessage('Please enter a valid 10-digit Indian mobile number.'),

  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .matches(STRONG_PASSWORD_REGEX)
    .withMessage(STRONG_PASSWORD_MSG),

  body('role')
    .isIn(['DONOR', 'RECIPIENT'])
    .withMessage('Role must be DONOR or RECIPIENT.'),
];

// ─── Change-password validation ──────────────────────────────────────────────
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required.'),

  body('newPassword')
    .notEmpty()
    .withMessage('New password is required.')
    .matches(STRONG_PASSWORD_REGEX)
    .withMessage(STRONG_PASSWORD_MSG),
];

router.post('/register', registerValidation, validate, register);
router.post('/login', [
  body('email').isEmail().withMessage('Please enter a valid email.'),
  body('password').notEmpty().withMessage('Password is required.'),
], validate, login);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePasswordValidation, validate, changePassword);

module.exports = router;
