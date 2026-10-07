const mongoose = require('mongoose');

const donationRecordSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodRequest', required: true },
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bloodGroup: { type: String, required: true },
    units: { type: Number, required: true },
    hospital: { type: String },
    donationDate: { type: Date, required: true },
    status: { type: String, enum: ['COMPLETED', 'PENDING', 'CANCELLED'], default: 'COMPLETED' },
    notes: { type: String },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DonationRecord', donationRecordSchema);
