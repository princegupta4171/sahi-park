const mongoose = require('mongoose');

const parkingSchema = new mongoose.Schema({
  spaceNumber: { type: Number, unique: true, required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  providerName: String,
  renterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  renterName: String,
  isAvailable: { type: Boolean, default: true },
  latitude: Number,
  longitude: Number,
  parkingArea: {
    startX: Number,
    startY: Number,
    endX: Number,
    endY: Number
  },
  mobile: String,
  email: String,
  address: String,
  pricePerHour: { type: Number, default: 50 },
  isPaid: { type: Boolean, default: false },
  bookingDuration: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  parkingName: String,
  totalSpaces: { type: Number, default: 1 },
  description: String
});

module.exports = mongoose.model('Parking', parkingSchema);
