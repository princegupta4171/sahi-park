const express = require('express');
const User = require('../models/User');
const { generateOTP, saveOTP, verifyOTP, sendEmailOTP, sendSmsOTP } = require('../config/otp');
const router = express.Router();

router.get('/users', async (req, res) => {
  const users = await User.find().select('username userType mobile email address createdAt');
  res.json(users);
});

router.post('/send-otp', async (req, res) => {
  try {
    const { email, mobile } = req.body;
    if (!email) return res.json({ success: false, message: 'Email required' });
    const existing = await User.findOne({ email });
    if (existing) return res.json({ success: false, message: 'Email already registered' });
    const otp = generateOTP();
    saveOTP(email, otp);
    const results = await Promise.allSettled([
      sendEmailOTP(email, otp),
      mobile ? sendSmsOTP(mobile, otp) : Promise.resolve(false)
    ]);
    const emailSent = results[0].status === 'fulfilled';
    const smsSent = results[1].value === true;
    console.log('OTP send — email:', emailSent, '| sms:', smsSent, '| otp:', otp);
    res.json({ success: true, message: `OTP sent${emailSent ? ' to email' : ''}${smsSent ? ' & SMS' : ''}` });
  } catch (err) {
    console.error('OTP send error:', err);
    res.json({ success: false, message: 'Failed to send OTP' });
  }
});

router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const valid = verifyOTP(email, otp);
  res.json({ success: valid, message: valid ? 'OTP verified' : 'Invalid or expired OTP' });
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, userType, mobile, email, address } = req.body;
    if (!username || !password || !userType || !mobile || !email || !address)
      return res.json({ success: false, message: 'All fields are required' });
    if (await User.findOne({ username })) return res.json({ success: false, message: 'Username already taken' });
    if (await User.findOne({ email })) return res.json({ success: false, message: 'Email already registered' });
    const user = new User({ username, password, userType, mobile, email, address });
    await user.save();
    res.json({ success: true, userId: user._id });
  } catch (err) {
    console.error('Register error:', err);
    res.json({ success: false, message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username, password: req.body.password });
    if (user) {
      res.json({ success: true, userId: user._id, username: user.username, userType: user.userType, mobile: user.mobile, email: user.email, address: user.address });
    } else {
      res.json({ success: false, message: 'Invalid username or password' });
    }
  } catch (err) {
    res.json({ success: false, message: 'Login failed' });
  }
});

module.exports = router;
