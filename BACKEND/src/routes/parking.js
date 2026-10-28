const express = require('express');
const Parking = require('../models/Parking');
const router = express.Router();

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

router.get('/nearby-spaces', async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required' });
    const maxRadius = parseFloat(radius) || 10;
    const spaces = await Parking.find({ providerId: { $ne: null }, latitude: { $ne: null }, longitude: { $ne: null } });
    const nearby = spaces
      .map(space => ({ ...space.toObject(), distance: calculateDistance(parseFloat(lat), parseFloat(lng), space.latitude, space.longitude) }))
      .filter(s => s.distance <= maxRadius)
      .sort((a, b) => a.distance - b.distance);
    res.json(nearby);
  } catch (err) {
    console.error('nearby-spaces error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/spaces', async (req, res) => {
  try {
    const spaces = await Parking.find();
    res.json(spaces);
  } catch (err) {
    console.error('spaces error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/provide', async (req, res) => {
  try {
    const { providerId, providerName, latitude, longitude, parkingArea, mobile, email, address, pricePerHour, parkingName, totalSpaces, description } = req.body;
    if (!latitude || !longitude) return res.json({ success: false, message: 'Location is required. Please select location on map.' });
    if (!providerId) return res.json({ success: false, message: 'Provider not authenticated' });
    if (!parkingName) return res.json({ success: false, message: 'Parking name is required' });

    const count = await Parking.countDocuments();
    const newSpace = new Parking({
      spaceNumber: count + 1,
      providerId, providerName, latitude, longitude,
      location: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
      parkingArea, mobile, email, address,
      pricePerHour: parseFloat(pricePerHour) || 50,
      parkingName,
      totalSpaces: parseInt(totalSpaces) || 1,
      description,
      isAvailable: true
    });
    await newSpace.save();
    res.json({ success: true, message: 'Parking space added successfully' });
  } catch (err) {
    console.error('provide error:', err);
    res.status(500).json({ success: false, message: 'Failed to add parking space' });
  }
});

router.post('/book', async (req, res) => {
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
    res.json({ success: true });
  } catch (err) {
    console.error('book error:', err);
    res.status(500).json({ success: false, message: 'Booking failed' });
  }
});

router.post('/payment', async (req, res) => {
  try {
    const { spaceId } = req.body;
    if (!spaceId) return res.json({ success: false, message: 'Space ID required' });
    const space = await Parking.findById(spaceId);
    if (!space) return res.json({ success: false, message: 'Space not found' });
    space.isPaid = true;
    await space.save();
    res.json({ success: true, message: 'Payment successful' });
  } catch (err) {
    console.error('payment error:', err);
    res.status(500).json({ success: false, message: 'Payment failed' });
  }
});

router.post('/release', async (req, res) => {
  try {
    const { spaceId, renterId } = req.body;
    const query = spaceId ? { _id: spaceId } : { spaceNumber: req.body.spaceNumber };
    if (renterId) query.renterId = renterId;
    const space = await Parking.findOne(query);
    if (!space) return res.json({ success: false, message: 'Parking space not found or not rented by you' });
    space.renterId = null;
    space.renterName = null;
    space.isAvailable = true;
    space.isPaid = false;
    space.bookingDuration = 0;
    space.totalAmount = 0;
    await space.save();
    res.json({ success: true, message: 'Parking space released successfully' });
  } catch (err) {
    console.error('release error:', err);
    res.status(500).json({ success: false, message: 'Release failed' });
  }
});

module.exports = router;
