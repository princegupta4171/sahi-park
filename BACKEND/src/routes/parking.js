const express = require('express');
const Parking = require('../models/Parking');
const { verifyToken } = require('../middleware/auth');
const { sendEmailOTP } = require('../config/otp');
const nodemailer = require('nodemailer');
const router = express.Router();

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function sendNotification(to, subject, html) {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (!emailUser || !emailPass || emailPass === 'APNA_APP_PASSWORD_YAHAN_LIKHO') return;
  try {
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: emailUser, pass: emailPass } });
    await transporter.sendMail({ from: `"Sahi Park 🅿️" <${emailUser}>`, to, subject, html });
  } catch { /* silent fail — notification is non-critical */ }
}

// ── Nearby spaces ──────────────────────────────────────────────────────────────
async function nearbyHandler(req, res) {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required' });
    const maxRadius = parseFloat(radius) || 10;
    const spaces = await Parking.find({ providerId: { $ne: null }, latitude: { $ne: null }, longitude: { $ne: null } });
    const nearby = spaces
      .map(s => ({ ...s.toObject(), distance: calculateDistance(parseFloat(lat), parseFloat(lng), s.latitude, s.longitude) }))
      .filter(s => s.distance <= maxRadius)
      .sort((a, b) => a.distance - b.distance);
    res.json(nearby);
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

router.get('/api/v1/nearby-spaces', nearbyHandler);
router.get('/nearby-spaces', nearbyHandler);

// ── All spaces ─────────────────────────────────────────────────────────────────
async function spacesHandler(req, res) {
  try {
    res.json(await Parking.find());
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

router.get('/api/v1/spaces', spacesHandler);
router.get('/spaces', spacesHandler);

// ── Provide space ──────────────────────────────────────────────────────────────
async function provideHandler(req, res) {
  try {
    const { providerId, providerName, latitude, longitude, parkingArea, mobile, email, address, pricePerHour, parkingName, totalSpaces, description } = req.body;
    if (!latitude || !longitude) return res.json({ success: false, message: 'Location is required. Please select location on map.' });
    if (!providerId) return res.json({ success: false, message: 'Provider not authenticated' });
    if (!parkingName) return res.json({ success: false, message: 'Parking name is required' });
    const count = await Parking.countDocuments();
    const newSpace = new Parking({
      spaceNumber: count + 1, providerId, providerName, latitude, longitude,
      location: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
      parkingArea, mobile, email, address,
      pricePerHour: parseFloat(pricePerHour) || 50,
      parkingName, totalSpaces: parseInt(totalSpaces) || 1, description, isAvailable: true
    });
    await newSpace.save();
    // Notify provider
    if (email) {
      sendNotification(email, '✅ Your Parking Space is Listed on Sahi Park',
        `<div style="font-family:Arial,sans-serif;padding:20px;background:#0a0a1a;color:white;border-radius:12px;">
          <h2>🅿️ Sahi Park — Space Listed!</h2>
          <p>Hi <strong>${providerName}</strong>,</p>
          <p>Your parking space <strong>${parkingName}</strong> has been successfully listed.</p>
          <p><strong>Address:</strong> ${address}</p>
          <p><strong>Price:</strong> ₹${pricePerHour}/hour</p>
          <p>Renters can now find and book your space. You'll be notified when someone books it.</p>
        </div>`
      );
    }
    res.json({ success: true, message: 'Parking space added successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to add parking space' });
  }
}

router.post('/api/v1/provide', provideHandler);
router.post('/provide', provideHandler);

// ── Book space ─────────────────────────────────────────────────────────────────
async function bookHandler(req, res) {
  try {
    const { spaceId, renterId, renterName, duration, totalAmount } = req.body;
    if (!spaceId || !renterId) return res.json({ success: false, message: 'Missing required fields' });
    const space = await Parking.findById(spaceId);
    if (!space) return res.json({ success: false, message: 'Space not found' });
    if (!space.isAvailable || space.renterId) return res.json({ success: false, message: 'Space not available' });
    space.renterId = renterId;
    space.renterName = renterName;
    space.isAvailable = false;
    space.bookingDuration = duration;
    space.totalAmount = totalAmount;
    space.isPaid = false;
    await space.save();
    // Notify provider that their space was booked
    if (space.email) {
      sendNotification(space.email, '🚗 Your Parking Space Has Been Booked!',
        `<div style="font-family:Arial,sans-serif;padding:20px;background:#0a0a1a;color:white;border-radius:12px;">
          <h2>🅿️ Sahi Park — New Booking!</h2>
          <p>Hi <strong>${space.providerName}</strong>,</p>
          <p>Your parking space <strong>${space.parkingName || space.address}</strong> has been booked.</p>
          <p><strong>Renter:</strong> ${renterName}</p>
          <p><strong>Duration:</strong> ${duration} hour(s)</p>
          <p><strong>Amount:</strong> ₹${totalAmount}</p>
        </div>`
      );
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Booking failed' });
  }
}

router.post('/api/v1/book', bookHandler);
router.post('/book', bookHandler);

// ── Payment ────────────────────────────────────────────────────────────────────
async function paymentHandler(req, res) {
  try {
    const { spaceId } = req.body;
    if (!spaceId) return res.json({ success: false, message: 'Space ID required' });
    const space = await Parking.findById(spaceId);
    if (!space) return res.json({ success: false, message: 'Space not found' });
    space.isPaid = true;
    await space.save();
    res.json({ success: true, message: 'Payment successful' });
  } catch {
    res.status(500).json({ success: false, message: 'Payment failed' });
  }
}

router.post('/api/v1/payment', paymentHandler);
router.post('/payment', paymentHandler);

// ── Release space ──────────────────────────────────────────────────────────────
async function releaseHandler(req, res) {
  try {
    const { spaceId, renterId, providerId } = req.body;
    const query = spaceId ? { _id: spaceId } : { spaceNumber: req.body.spaceNumber };
    // Provider can force release their own space, renter can release their booking
    if (providerId) query.providerId = providerId;
    else if (renterId) query.renterId = renterId;
    const space = await Parking.findOne(query);
    if (!space) return res.json({ success: false, message: 'Parking space not found or not authorized' });
    if (!space.renterId) return res.json({ success: false, message: 'Space is already available' });
    const renterName = space.renterName;
    space.renterId = null; space.renterName = null; space.isAvailable = true;
    space.isPaid = false; space.bookingDuration = 0; space.totalAmount = 0;
    await space.save();
    // Notify provider that space was released
    if (space.email) {
      sendNotification(space.email, '🔓 Your Parking Space Has Been Released',
        `<div style="font-family:Arial,sans-serif;padding:20px;background:#0a0a1a;color:white;border-radius:12px;">
          <h2>🅿️ Sahi Park — Space Released</h2>
          <p>Hi <strong>${space.providerName}</strong>,</p>
          <p>Your parking space <strong>${space.parkingName || space.address}</strong> has been released by <strong>${renterName}</strong>.</p>
          <p>It is now available for new bookings.</p>
        </div>`
      );
    }
    res.json({ success: true, message: 'Parking space released successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Release failed' });
  }
}

router.post('/api/v1/release', releaseHandler);
router.post('/release', releaseHandler);

module.exports = router;
