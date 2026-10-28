const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true },
  password: { type: String, required: true },
  userType: { type: String, enum: ['provider', 'renter'], required: true },
  mobile: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  address: { type: String, required: true }
}, { timestamps: true });

// Index for fast login/lookup queries
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

module.exports = mongoose.model('User', userSchema);
