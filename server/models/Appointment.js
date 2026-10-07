const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: ['MONTHLY_HEALTH_CHECK', 'DOCTOR_CONSULTATION'],
      required: true,
    },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    hospital: { type: String, required: true },
    reason: { type: String, required: true },
    notes: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
    },
    cancellationReason: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
