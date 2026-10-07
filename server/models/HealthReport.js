const mongoose = require('mongoose');

const healthReportSchema = new mongoose.Schema(
  {
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
    reportDate: { type: Date, default: Date.now },
    reportType: {
      type: String,
      enum: ['INITIAL', 'MONTHLY', 'FOLLOW_UP'],
      default: 'MONTHLY',
    },
    // Measurements
    age: { type: Number },
    height: { type: Number }, // cm
    weight: { type: Number }, // kg
    bmi: { type: Number },
    systolicBP: { type: Number },
    diastolicBP: { type: Number },
    hemoglobin: { type: Number }, // g/dL
    pulse: { type: Number }, // bpm
    temperature: { type: Number }, // °C
    fastingBloodSugar: { type: Number }, // mg/dL
    // Medical observations
    medicalObservations: { type: String },
    notes: { type: String },
    // Medical questionnaire responses (for initial report)
    medicalResponses: {
      currentIllness: String,
      diabetes: Boolean,
      heartConditions: Boolean,
      kidneyConditions: Boolean,
      currentMedications: String,
      recentSurgery: Boolean,
      recentDentalProcedure: Boolean,
      recentTattoo: Boolean,
      recentPiercing: Boolean,
      recentVaccination: Boolean,
      smoking: String,
      alcoholConsumption: String,
      otherMedicalConditions: String,
      previousBloodDonation: Boolean,
      lastDonationDate: Date,
      numberOfPreviousDonations: Number,
      preferredDonationLocation: String,
      availableDays: [String],
      preferredTime: String,
    },
    // Screening results
    healthScore: { type: Number },
    calculatedStatus: {
      type: String,
      enum: ['PENDING', 'ELIGIBLE', 'HOLD', 'MEDICAL_REVIEW', 'NOT_ELIGIBLE'],
    },
    statusReason: { type: String },
    statusFlags: [{ type: String }], // array of reasons
    // Review
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HealthReport', healthReportSchema);
