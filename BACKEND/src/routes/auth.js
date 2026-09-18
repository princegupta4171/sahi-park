const express = require('express');
const User = require('../models/User');
const { generateOTP, saveOTP, verifyOTP, sendEmailOTP } = require('../config/otp');
const router = express.Router();

router.get('/users', async (req, res) => {
  const users = await User.find().select('username password userType mobile email address createdAt');
  res.json(users);
});

// Send OTP to email
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ success: false, message: 'Email required' });
    const existing = await User.findOne({ email });
    if (existing) return res.json({ success: false, message: 'Email already registered' });
    const otp = generateOTP();
    saveOTP(email, otp);
    await sendEmailOTP(email, otp);
    res.json({ success: true, message: 'OTP sent to email' });
  } catch (err) {
    console.error('OTP send error:', err);
    res.json({ success: false, message: 'Failed to send OTP' });
  }
});

// Verify OTP
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const valid = verifyOTP(email, otp);
  res.json({ success: valid, message: valid ? 'OTP verified' : 'Invalid or expired OTP' });
});

router.post('/register', async (req, res) => {
  try {
    const existing = await User.findOne({ username: req.body.username });
    if (existing) return res.json({ success: false, message: 'Username already taken' });
    const user = new User(req.body);
    await user.save();
    res.json({ success: true, userId: user._id });
  } catch (err) {
    res.json({ success: false, message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const user = await User.findOne({ username: req.body.username, password: req.body.password });
  if (user) {
    res.json({ success: true, userId: user._id, username: user.username, userType: user.userType, mobile: user.mobile, email: user.email, address: user.address });
  } else {
    res.json({ success: false, message: 'Invalid username or password' });
  }
});

module.exports = router;
