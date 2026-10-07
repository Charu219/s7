const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    specialization: { type: String, required: true },
    hospital: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, trim: true, lowercase: true },
    availableDays: [{ type: String }],
    availableTime: { type: String },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Doctor', doctorSchema);
