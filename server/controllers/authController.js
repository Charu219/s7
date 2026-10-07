const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Donor = require('../models/Donor');
const Recipient = require('../models/Recipient');
const { createNotification } = require('../services/notificationService');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, dateOfBirth, gender, address, city, emergencyContact, bloodGroup, age } = req.body;

    // Only DONOR and RECIPIENT can self-register
    if (!['DONOR', 'RECIPIENT'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Public registration is only available for Donors and Recipients.' });
    }

    // Check existing
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const user = await User.create({
      name,
      email,
      passwordHash: password, // hashed in pre-save hook
      role,
      phone,
      dateOfBirth,
      gender,
      address,
      city,
      emergencyContact,
    });

    // Create role-specific profile
    if (role === 'DONOR') {
      await Donor.create({ userId: user._id, bloodGroup });
      await createNotification({
        userId: user._id,
        title: 'Welcome to HealthBridge!',
        message: 'Your donor account has been created. Please complete your initial health questionnaire to proceed.',
        type: 'REGISTRATION',
      });
    } else if (role === 'RECIPIENT') {
      await Recipient.create({ userId: user._id });
      await createNotification({
        userId: user._id,
        title: 'Welcome to HealthBridge!',
        message: 'Your recipient account has been created. You can now submit blood requests.',
        type: 'REGISTRATION',
      });
    }

    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
    }

    const token = signToken(user._id);

    // If donor, include questionnaire status
    let donorData = null;
    if (user.role === 'DONOR') {
      donorData = await Donor.findOne({ userId: user._id }).lean();
    }

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: user.toJSON(),
      donor: donorData,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    let donorData = null;
    let recipientData = null;

    if (user.role === 'DONOR') {
      donorData = await Donor.findOne({ userId: user._id }).lean();
    } else if (user.role === 'RECIPIENT') {
      recipientData = await Recipient.findOne({ userId: user._id }).lean();
    }

    res.status(200).json({
      success: true,
      user: user.toJSON(),
      donor: donorData,
      recipient: recipientData,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.passwordHash = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, changePassword };
