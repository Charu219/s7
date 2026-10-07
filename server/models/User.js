const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'DONOR', 'RECIPIENT'], required: true },
    phone: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    emergencyContact: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    // FCM Push Notification tokens (one per browser/device)
    fcmTokens: [
      {
        token: { type: String, required: true },
        device: { type: String, default: 'web' }, // e.g. 'web', 'android', 'ios'
        registeredAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);


// Hash password before saving
// Note: Mongoose 7+ async pre-hooks resolve via the returned Promise — no `next` needed
userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Never return password in JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
