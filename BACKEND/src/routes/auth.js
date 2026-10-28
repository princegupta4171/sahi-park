const express = require('express');
const User = require('../models/User');
const { generateOTP, saveOTP, verifyOTP, sendEmailOTP } = require('../config/otp');
const router = express.Router();

router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('username userType mobile email address createdAt');
    res.json(users);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

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
    res.json({ success: false, message: 'Failed to send OTP. Check email configuration.' });
  }
});

router.post('/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.json({ success: false, message: 'Email and OTP required' });
    const valid = verifyOTP(email, otp);
    res.json({ success: valid, message: valid ? 'OTP verified' : 'Invalid or expired OTP' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, userType, mobile, email, address } = req.body;
    if (!username || !password || !userType || !mobile || !email || !address) {
      return res.json({ success: false, message: 'All fields are required' });
    }
    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.json({ success: false, message: 'Username already taken' });
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.json({ success: false, message: 'Email already registered' });
    const user = new User({ username, password, userType, mobile, email, address });
    await user.save();
    res.json({ success: true, userId: user._id });
  } catch (err) {
    console.error('Register error:', err);
    res.json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ success: false, message: 'Username and password required' });
    const user = await User.findOne({ username, password });
    if (user) {
      res.json({ success: true, userId: user._id, username: user.username, userType: user.userType, mobile: user.mobile, email: user.email, address: user.address });
    } else {
      res.json({ success: false, message: 'Invalid username or password' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
