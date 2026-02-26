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
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

router.get('/nearby-spaces', async (req, res) => {
  const { lat, lng } = req.query;
  const spaces = await Parking.find({ providerId: { $ne: null }, isAvailable: true });
  const nearby = spaces.map(space => ({
    ...space.toObject(),
    distance: calculateDistance(parseFloat(lat), parseFloat(lng), space.latitude, space.longitude)
  })).filter(s => s.distance < 10).sort((a, b) => a.distance - b.distance);
  res.json(nearby);
});

router.get('/spaces', async (req, res) => {
  const spaces = await Parking.find();
  res.json(spaces);
});

router.post('/provide', async (req, res) => {
  const { providerId, providerName, latitude, longitude, parkingArea, mobile, email, address, pricePerHour, parkingName, totalSpaces, description } = req.body;
  
  if (!latitude || !longitude) {
    return res.json({ success: false, message: 'Location is required' });
  }
  
  const newSpace = new Parking({
    spaceNumber: await Parking.countDocuments() + 1,
    providerId,
    providerName,
    latitude,
    longitude,
    parkingArea,
    mobile,
    email,
    address,
    pricePerHour: pricePerHour || 50,
    parkingName,
    totalSpaces: totalSpaces || 1,
    description,
    isAvailable: true
  });
  await newSpace.save();
  res.json({ success: true, message: 'Parking space added successfully' });
});

router.post('/book', async (req, res) => {
  const { spaceId, renterId, renterName, duration, totalAmount } = req.body;
  const space = await Parking.findById(spaceId);
  if (space && !space.renterId) {
    space.renterId = renterId;
    space.renterName = renterName;
    space.isAvailable = false;
    space.bookingDuration = duration;
    space.totalAmount = totalAmount;
    space.isPaid = false;
    await space.save();
    res.json({ success: true });
  } else {
    res.json({ success: false, message: 'Space not available' });
  }
});

router.post('/payment', async (req, res) => {
  const { spaceId } = req.body;
  const space = await Parking.findById(spaceId);
  if (space) {
    space.isPaid = true;
    await space.save();
    res.json({ success: true, message: 'Payment successful' });
  } else {
    res.json({ success: false, message: 'Space not found' });
  }
});

router.post('/release', async (req, res) => {
  const { spaceNumber, renterId } = req.body;
  const space = await Parking.findOne({ spaceNumber, renterId });
  if (space) {
    space.renterId = null;
    space.renterName = null;
    space.isAvailable = true;
    await space.save();
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

module.exports = router;
