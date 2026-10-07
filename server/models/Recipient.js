const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    totalRequests: { type: Number, default: 0 },
    activeRequests: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recipient', recipientSchema);
