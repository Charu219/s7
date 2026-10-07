const Donor = require('../models/Donor');
const User = require('../models/User');
const HealthReport = require('../models/HealthReport');
const { performEligibilityScreening, calculateBMI, calculateAge } = require('../services/eligibilityService');
const { createNotification } = require('../services/notificationService');

// POST /api/health-reports  (admin creates report for donor)
const createHealthReport = async (req, res, next) => {
  try {
    const {
      donorId,
      reportType = 'MONTHLY',
      systolicBP, diastolicBP, hemoglobin, pulse, temperature,
      fastingBloodSugar, weight, height,
      medicalObservations, notes,
    } = req.body;

    const donor = await Donor.findById(donorId).populate('userId');
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found.' });

    const age = calculateAge(donor.userId.dateOfBirth);
    const bmi = calculateBMI(weight, height);

    // Perform preliminary screening
    const screening = performEligibilityScreening({
      age,
      gender: donor.userId.gender,
      weight,
      height,
      hemoglobin,
      systolicBP,
      diastolicBP,
      pulse,
      temperature,
      fastingBloodSugar,
      lastDonationDate: donor.lastDonationDate,
      medicalResponses: {},
    });

    const report = await HealthReport.create({
      donorId,
      reportType,
      reportDate: new Date(),
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
      medicalObservations,
      notes,
      healthScore: screening.healthScore,
      calculatedStatus: screening.status,
      statusReason: screening.statusReason,
      statusFlags: screening.flags,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
    });

    // Update donor's health info
    donor.previousStatus = donor.donorStatus;
    donor.donorStatus = screening.status;
    donor.statusReason = screening.statusReason;
    donor.statusChangedBy = req.user._id;
    donor.statusChangedAt = new Date();
    donor.healthScore = screening.healthScore;
    donor.lastHealthCheck = new Date();
    donor.nextHealthCheck = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await donor.save();

    const hrClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    // Notify donor
    await createNotification({
      userId: donor.userId._id,
      title: 'Health Report Updated',
      message: `Your health report has been updated. Current status: ${screening.status}. ${screening.statusReason}`,
      type: 'HEALTH_REPORT',
      relatedId: report._id,
      relatedModel: 'HealthReport',
      clickUrl: `${hrClientUrl}/donor/health-reports`,
      emailData: {
        eligibilityStatus: screening.status,
        reportDate:        report.reportDate,
        statusReason:      screening.statusReason,
      },
    });

    // If put on hold/medical review, create notification about appointment
    if (['HOLD', 'MEDICAL_REVIEW'].includes(screening.status)) {
      await createNotification({
        userId: donor.userId._id,
        title: 'Action Required',
        message: `Your donor status has changed to ${screening.status}. Please contact HealthBridge for a follow-up appointment.`,
        type: 'STATUS_CHANGE',
        clickUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/donor/appointments`,
        emailData: {
          isMedicalReview: true,
          newStatus:       screening.status,
          statusReason:    screening.statusReason,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Health report saved and eligibility screening completed.',
      report,
      screening: {
        status: screening.status,
        healthScore: screening.healthScore,
        flags: screening.flags,
        warnings: screening.warnings,
        bmi,
        bmiCategory: screening.bmiCategory,
        statusReason: screening.statusReason,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createHealthReport };
