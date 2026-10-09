const User = require('../models/User');
const Donor = require('../models/Donor');
const HealthReport = require('../models/HealthReport');
const Appointment = require('../models/Appointment');
const DonationRecord = require('../models/DonationRecord');
const { createNotification } = require('../services/notificationService');
const {
  performEligibilityScreening,
  calculateBMI,
  calculateAge,
} = require('../services/eligibilityService');

// GET /api/donors  (admin)
const getAllDonors = async (req, res, next) => {
  try {
    const { bloodGroup, status, gender, city, search, page = 1, limit = 20 } = req.query;

    // Always exclude soft-deleted donors
    const filter = { isDeleted: { $ne: true } };
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (status) filter.donorStatus = status;

    // Join with User for name/email/phone/gender/city search
    let userFilter = {};
    if (gender) userFilter.gender = gender;
    if (city) userFilter.city = { $regex: city, $options: 'i' };
    if (search) {
      userFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (Object.keys(userFilter).length > 0) {
      // Also restrict User search to active accounts
      userFilter.isActive = true;
      const users = await User.find(userFilter).select('_id');
      const userIds = users.map((u) => u._id);
      filter.userId = { $in: userIds };
    } else {
      // Even without a search filter, exclude donors whose User is inactive/deleted
      // (handles orphaned donors where User was deleted outside this flow)
      const activeUserIds = await User.find({ role: 'DONOR', isActive: true }).select('_id').lean();
      filter.userId = { $in: activeUserIds.map((u) => u._id) };
    }

    const total = await Donor.countDocuments(filter);
    const donors = await Donor.find(filter)
      .populate('userId', 'name email phone dateOfBirth gender address city emergencyContact isActive createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    // Final safety: drop any donor whose userId populated as null (true orphan)
    const activeDonors = donors.filter((d) => d.userId != null);

    res.status(200).json({
      success: true,
      total: activeDonors.length,
      page: Number(page),
      pages: Math.ceil(activeDonors.length / limit),
      donors: activeDonors,
    });
  } catch (error) {
    next(error);
  }
};


// GET /api/donors/:id
const getDonorById = async (req, res, next) => {
  try {
    const donor = await Donor.findById(req.params.id).populate('userId', '-passwordHash');
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found.' });

    // If requesting user is the donor, verify it's their own record
    if (req.user.role === 'DONOR') {
      const myDonor = await Donor.findOne({ userId: req.user._id });
      if (!myDonor || myDonor._id.toString() !== req.params.id) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    res.status(200).json({ success: true, donor });
  } catch (error) {
    next(error);
  }
};

// GET /api/donors/me  (current donor)
const getMyDonorProfile = async (req, res, next) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id }).populate('userId', '-passwordHash');
    if (!donor) return res.status(404).json({ success: false, message: 'Donor profile not found.' });

    const latestReport = await HealthReport.findOne({ donorId: donor._id }).sort({ reportDate: -1 });
    const upcomingAppointments = await Appointment.find({
      donorId: donor._id,
      status: { $in: ['PENDING', 'CONFIRMED'] },
      date: { $gte: new Date() },
    })
      .populate('doctorId', 'name specialization hospital')
      .sort({ date: 1 })
      .limit(5);

    const donations = await DonationRecord.find({ donorId: donor._id })
      .sort({ donationDate: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      donor,
      latestReport,
      upcomingAppointments,
      recentDonations: donations,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/donors/:id  (admin or own donor)
const updateDonor = async (req, res, next) => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found.' });

    // Donors can only update their own
    if (req.user.role === 'DONOR') {
      const myDonor = await Donor.findOne({ userId: req.user._id });
      if (!myDonor || myDonor._id.toString() !== req.params.id) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
      // Donors can only update availability/preferences
      const { availability, preferredDays, preferredTime, preferredLocation } = req.body;
      Object.assign(donor, { availability, preferredDays, preferredTime, preferredLocation });
    } else {
      // Admin can update most fields on User + Donor
      const { availability, preferredDays, preferredTime, preferredLocation, donorStatus, statusReason } = req.body;
      Object.assign(donor, { availability, preferredDays, preferredTime, preferredLocation });

      if (donorStatus && req.user.role === 'ADMIN') {
        donor.previousStatus = donor.donorStatus;
        donor.donorStatus = donorStatus;
        donor.statusReason = statusReason || '';
        donor.statusChangedBy = req.user._id;
        donor.statusChangedAt = new Date();

        // Notify donor
        await createNotification({
          userId: donor.userId,
          title: 'Donor Status Updated',
          message: `Your donor status has been updated to: ${donorStatus}. ${statusReason || ''}`,
          type: 'STATUS_CHANGE',
          relatedId: donor._id,
          relatedModel: 'Donor',
          clickUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/donor/dashboard`,
          emailData: {
            newStatus:    donorStatus,
            statusReason: statusReason || '',
          },
        });
      }
    }

    await donor.save();

    // Update user profile fields if provided
    if (req.user.role === 'ADMIN' && req.body.user) {
      const { name, phone, address, city, emergencyContact } = req.body.user;
      await User.findByIdAndUpdate(donor.userId, { name, phone, address, city, emergencyContact });
    }

    res.status(200).json({ success: true, message: 'Donor updated.', donor });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/donors/:id  (admin only)
const deleteDonor = async (req, res, next) => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found.' });

    // 1. Soft-delete the Donor record so it is excluded from all active-donor queries
    donor.isDeleted  = true;
    donor.deletedAt  = new Date();
    donor.donorStatus = 'NOT_ELIGIBLE';
    donor.availability = false;
    await donor.save();

    // 2. Deactivate the linked User account so they can no longer log in
    await User.findByIdAndUpdate(donor.userId, { isActive: false });

    res.status(200).json({ success: true, message: 'Donor deleted successfully.' });
  } catch (error) {
    next(error);
  }
};


// POST /api/donors/questionnaire  (donor, once only)
const submitQuestionnaire = async (req, res, next) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) return res.status(404).json({ success: false, message: 'Donor profile not found.' });

    if (donor.initialQuestionnaireCompleted) {
      return res.status(400).json({ success: false, message: 'Initial health questionnaire has already been completed.' });
    }

    const {
      height, weight, systolicBP, diastolicBP, hemoglobin, pulse, temperature, fastingBloodSugar,
      currentIllness, diabetes, heartConditions, kidneyConditions, currentMedications,
      recentSurgery, recentDentalProcedure, recentTattoo, recentPiercing, recentVaccination,
      smoking, alcoholConsumption, otherMedicalConditions,
      previousBloodDonation, lastDonationDate, numberOfPreviousDonations,
      preferredDonationLocation, availableDays, preferredTime,
    } = req.body;

    const user = await User.findById(req.user._id);
    const age = calculateAge(user.dateOfBirth);
    const bmi = calculateBMI(weight, height);

    const medicalResponses = {
      currentIllness, diabetes, heartConditions, kidneyConditions, currentMedications,
      recentSurgery, recentDentalProcedure, recentTattoo, recentPiercing, recentVaccination,
      smoking, alcoholConsumption, otherMedicalConditions,
      previousBloodDonation, lastDonationDate, numberOfPreviousDonations,
      preferredDonationLocation, availableDays, preferredTime,
    };

    // Perform preliminary screening
    const screening = performEligibilityScreening({
      age,
      gender: user.gender,
      weight,
      height,
      hemoglobin,
      systolicBP,
      diastolicBP,
      pulse,
      temperature,
      fastingBloodSugar,
      lastDonationDate: previousBloodDonation ? lastDonationDate : null,
      medicalResponses,
    });

    // Save initial health report
    const healthReport = await HealthReport.create({
      donorId: donor._id,
      reportType: 'INITIAL',
      age,
      height,
      weight,
      bmi,
      systolicBP,
      diastolicBP,
      hemoglobin,
      pulse,
      temperature,
      fastingBloodSugar,
      medicalResponses,
      healthScore: screening.healthScore,
      calculatedStatus: screening.status,
      statusReason: screening.statusReason,
      statusFlags: screening.flags,
    });

    // Update donor
    donor.initialQuestionnaireCompleted = true;
    donor.healthScore = screening.healthScore;
    donor.lastHealthCheck = new Date();
    donor.nextHealthCheck = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    donor.preferredLocation = preferredDonationLocation;
    donor.preferredDays = availableDays || [];
    donor.preferredTime = preferredTime;
    // Apply screening result directly — admin can override at any time
    // Previously hardcoded to 'PENDING'; now auto-approved when screening passes
    donor.donorStatus   = screening.status;   // 'ELIGIBLE' | 'HOLD' | 'MEDICAL_REVIEW' | 'NOT_ELIGIBLE'
    donor.statusReason  = screening.statusReason;
    donor.statusChangedAt = new Date();
    donor.initialData = {
      height, weight, currentIllness, diabetes, heartConditions, kidneyConditions,
      currentMedications, recentSurgery, recentDentalProcedure, recentTattoo, recentPiercing,
      recentVaccination, smoking, alcoholConsumption, otherMedicalConditions,
      previousBloodDonation, lastDonationDate, numberOfPreviousDonations,
    };

    if (lastDonationDate && previousBloodDonation) {
      donor.lastDonationDate = new Date(lastDonationDate);
    }

    await donor.save();

    await createNotification({
      userId: req.user._id,
      title: screening.status === 'ELIGIBLE'
        ? '🎉 You are now Eligible to Donate!'
        : 'Health Questionnaire Submitted',
      message: screening.status === 'ELIGIBLE'
        ? 'Your health questionnaire has been reviewed. You are now ELIGIBLE to respond to blood requests!'
        : `Your health questionnaire has been submitted. Current status: ${screening.status}. ${screening.statusReason || ''}`,
      type: 'QUESTIONNAIRE_REMINDER',
      emailData: {
        status: screening.status,
        clickUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/donor/dashboard`,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Initial health questionnaire submitted successfully. Your application is under review.',
      screening: {
        status: screening.status,
        healthScore: screening.healthScore,
        flags: screening.flags,
        bmi,
        bmiCategory: screening.bmiCategory,
        statusReason: screening.statusReason,
      },
      healthReport,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/donors/:id/health-reports
const getHealthReports = async (req, res, next) => {
  try {
    const donorId = req.params.id;
    // Verify access
    if (req.user.role === 'DONOR') {
      const myDonor = await Donor.findOne({ userId: req.user._id });
      if (!myDonor || myDonor._id.toString() !== donorId) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    const reports = await HealthReport.find({ donorId })
      .populate('reviewedBy', 'name')
      .sort({ reportDate: -1 });

    res.status(200).json({ success: true, healthReports: reports });
  } catch (error) {
    next(error);
  }
};

// GET /api/donors/:id/donations
const getDonationHistory = async (req, res, next) => {
  try {
    const donorId = req.params.id;
    if (req.user.role === 'DONOR') {
      const myDonor = await Donor.findOne({ userId: req.user._id });
      if (!myDonor || myDonor._id.toString() !== donorId) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    const donations = await DonationRecord.find({ donorId })
      .populate('requestId', 'requestId bloodGroup hospitalName')
      .sort({ donationDate: -1 });

    res.status(200).json({ success: true, donations });
  } catch (error) {
    next(error);
  }
};

// GET /api/donors/:id/appointments
const getDonorAppointments = async (req, res, next) => {
  try {
    const donorId = req.params.id;
    if (req.user.role === 'DONOR') {
      const myDonor = await Donor.findOne({ userId: req.user._id });
      if (!myDonor || myDonor._id.toString() !== donorId) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    const appointments = await Appointment.find({ donorId })
      .populate('doctorId', 'name specialization hospital phone')
      .sort({ date: -1 });

    res.status(200).json({ success: true, appointments });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDonors,
  getDonorById,
  getMyDonorProfile,
  updateDonor,
  deleteDonor,
  submitQuestionnaire,
  getHealthReports,
  getDonationHistory,
  getDonorAppointments,
};
