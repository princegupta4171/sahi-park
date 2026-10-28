const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateOTP, saveOTP, verifyOTP, sendEmailOTP } = require('../config/otp');
const { generateToken, verifyToken } = require('../middleware/auth');
const router = express.Router();

// GET /api/v1/users — admin only (protected)
router.get('/api/v1/users', verifyToken, async (req, res) => {
  try {
    if (req.user.userType !== 'admin')
      return res.status(403).json({ success: false, message: 'Forbidden' });
    const users = await User.find().select('username userType mobile email address createdAt');
    res.json(users);
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Keep old /users for admin panel (password already excluded)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('username userType mobile email address createdAt');
    res.json(users);
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/api/v1/send-otp', async (req, res) => {
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
    res.json({ success: false, message: 'Failed to send OTP. Check email configuration.' });
  }
});

// Legacy route
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ success: false, message: 'Email required' });
    const existing = await User.findOne({ email });
    if (existing) return res.json({ success: false, message: 'Email already registered' });
    const otp = generateOTP();
    saveOTP(email, otp);
    const result = await sendEmailOTP(email, otp);
    if (result && result.debugOtp) return res.json({ success: true, debugOtp: result.debugOtp });
    res.json({ success: true, message: 'OTP sent to email' });
  } catch {
    res.json({ success: false, message: 'Failed to send OTP.' });
  }
});

router.post('/api/v1/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.json({ success: false, message: 'Email and OTP required' });
    res.json({ success: verifyOTP(email, otp), message: verifyOTP(email, otp) ? 'OTP verified' : 'Invalid or expired OTP' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.json({ success: false, message: 'Email and OTP required' });
    const valid = verifyOTP(email, otp);
    res.json({ success: valid, message: valid ? 'OTP verified' : 'Invalid or expired OTP' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/api/v1/register', async (req, res) => {
  try {
    const { username, password, userType, mobile, email, address } = req.body;
    if (!username || !password || !userType || !mobile || !email || !address)
      return res.json({ success: false, message: 'All fields are required' });
    if (await User.findOne({ username })) return res.json({ success: false, message: 'Username already taken' });
    if (await User.findOne({ email })) return res.json({ success: false, message: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed, userType, mobile, email, address });
    await user.save();
    const token = generateToken(user);
    res.json({ success: true, userId: user._id, token });
  } catch {
    res.json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, userType, mobile, email, address } = req.body;
    if (!username || !password || !userType || !mobile || !email || !address)
      return res.json({ success: false, message: 'All fields are required' });
    if (await User.findOne({ username })) return res.json({ success: false, message: 'Username already taken' });
    if (await User.findOne({ email })) return res.json({ success: false, message: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed, userType, mobile, email, address });
    await user.save();
    const token = generateToken(user);
    res.json({ success: true, userId: user._id, token });
  } catch {
    res.json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

router.post('/api/v1/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ success: false, message: 'Username and password required' });
    const user = await User.findOne({ username });
    if (!user) return res.json({ success: false, message: 'Invalid username or password' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, message: 'Invalid username or password' });
    const token = generateToken(user);
    res.json({ success: true, token, userId: user._id, username: user.username, userType: user.userType, mobile: user.mobile, email: user.email, address: user.address });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ success: false, message: 'Username and password required' });
    const user = await User.findOne({ username });
    if (!user) return res.json({ success: false, message: 'Invalid username or password' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, message: 'Invalid username or password' });
    const token = generateToken(user);
    res.json({ success: true, token, userId: user._id, username: user.username, userType: user.userType, mobile: user.mobile, email: user.email, address: user.address });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
