const mongoose = require('mongoose');

const donorResponseSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodRequest', required: true },
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
    response: { type: String, enum: ['PENDING', 'ACCEPTED', 'DECLINED'], default: 'PENDING' },
    acceptedAt: { type: Date },
    declinedAt: { type: Date },
    declineReason: { type: String },
    contactShared: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One response per donor per request
donorResponseSchema.index({ requestId: 1, donorId: 1 }, { unique: true });

module.exports = mongoose.model('DonorResponse', donorResponseSchema);
