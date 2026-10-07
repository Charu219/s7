const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'REGISTRATION',
        'QUESTIONNAIRE_REMINDER',
        'HEALTH_CHECK_REMINDER',
        'APPOINTMENT',
        'HEALTH_REPORT',
        'BLOOD_REQUEST',
        'REQUEST_ACCEPTED',
        'CONTACT_SHARED',
        'DONATION_COMPLETED',
        'STATUS_CHANGE',
        'GENERAL',
        'EMERGENCY',
      ],
      default: 'GENERAL',
    },
    isRead: { type: Boolean, default: false },
    relatedId: { type: mongoose.Schema.Types.ObjectId }, // bloodRequest, appointment, etc.
    relatedModel: { type: String }, // 'BloodRequest', 'Appointment', etc.
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
