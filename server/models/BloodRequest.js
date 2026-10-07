const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const bloodRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, default: () => `BR-${uuidv4().slice(0, 8).toUpperCase()}`, unique: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Patient info
    patientName: { type: String, required: true },
    patientAge: { type: Number, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Other' },
    // Blood requirement
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
    },
    unitsRequired: { type: Number, required: true, min: 1 },
    urgency: { type: String, enum: ['EMERGENCY', 'URGENT', 'NORMAL'], default: 'NORMAL' },
    requiredDate: { type: Date, required: true },
    // Hospital info
    hospitalName: { type: String, required: true },
    hospitalLocation: { type: String, required: true },
    hospitalContact: { type: String, required: true },
    // Additional
    doctorName: { type: String },
    reason: { type: String },
    notes: { type: String },
    // Status
    status: {
      type: String,
      enum: ['PENDING', 'SEARCHING', 'DONOR_ACCEPTED', 'CONTACT_SHARED', 'DONATION_COMPLETED', 'CANCELLED', 'EXPIRED'],
      default: 'PENDING',
    },
    // Matching
    matchedDonors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Donor' }],
    notifiedDonors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Donor' }],
    acceptedDonor: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
    // Admin
    adminNotes: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
