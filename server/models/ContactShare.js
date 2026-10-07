const mongoose = require('mongoose');

const contactShareSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodRequest', required: true },
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sharedAt: { type: Date, default: Date.now },
    // What was shared with recipient (donor's contact info)
    donorContactShared: {
      name: String,
      phone: String,
      bloodGroup: String,
      city: String,
      address: String,
    },
    // What was shared with donor (recipient personal contact info)
    recipientContactShared: {
      name: String,
      phone: String,
      address: String,
      city: String,
      hospitalName: String,
      hospitalLocation: String,
      hospitalContact: String,
      patientName: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ContactShare', contactShareSchema);
