const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
    },
    initialQuestionnaireCompleted: { type: Boolean, default: false },
    donorStatus: {
      type: String,
      enum: ['PENDING', 'ELIGIBLE', 'HOLD', 'MEDICAL_REVIEW', 'NOT_ELIGIBLE'],
      default: 'PENDING',
    },
    statusReason: { type: String },
    statusChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    statusChangedAt: { type: Date },
    previousStatus: { type: String },
    healthScore: { type: Number, default: null },
    lastHealthCheck: { type: Date, default: null },
    nextHealthCheck: { type: Date, default: null },
    lastDonationDate: { type: Date, default: null },
    nextEligibleDonationDate: { type: Date, default: null },
    totalDonations: { type: Number, default: 0 },
    availability: { type: Boolean, default: true },
    preferredDays: [{ type: String }],
    preferredTime: { type: String },
    preferredLocation: { type: String },
    // Initial questionnaire snapshot (medical history etc.)
    initialData: {
      height: Number,
      weight: Number,
      currentIllness: String,
      diabetes: { type: Boolean, default: false },
      heartConditions: { type: Boolean, default: false },
      kidneyConditions: { type: Boolean, default: false },
      currentMedications: String,
      recentSurgery: { type: Boolean, default: false },
      recentDentalProcedure: { type: Boolean, default: false },
      recentTattoo: { type: Boolean, default: false },
      recentPiercing: { type: Boolean, default: false },
      recentVaccination: { type: Boolean, default: false },
      smoking: { type: String, enum: ['Never', 'Occasionally', 'Regularly', ''], default: '' },
      alcoholConsumption: { type: String, enum: ['Never', 'Occasionally', 'Regularly', ''], default: '' },
      otherMedicalConditions: String,
      previousBloodDonation: { type: Boolean, default: false },
      lastDonationDate: Date,
      numberOfPreviousDonations: { type: Number, default: 0 },
    },
    // ── Soft-delete flag ──────────────────────────────────────────────────────
    // When Admin deletes a donor this is set to true.
    // Every active-donor query MUST include { isDeleted: { $ne: true } }.
    isDeleted:  { type: Boolean, default: false },
    deletedAt:  { type: Date,    default: null  },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Donor', donorSchema);
