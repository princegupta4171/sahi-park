const express = require('express');
const User = require('../models/User');
const { generateOTP, saveOTP, verifyOTP, sendEmailOTP, sendSmsOTP } = require('../config/otp');
const router = express.Router();

router.get('/users', async (req, res) => {
  const users = await User.find().select('username userType mobile email address createdAt');
  res.json(users);
});

// ── Debug: Test email config ───────────────────────────────────────────────────
router.get('/debug-email', async (req, res) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const fast2sms = process.env.FAST2SMS_API_KEY;

  if (!emailUser || !emailPass) {
    return res.json({
      success: false,
      message: 'Email env vars missing',
      EMAIL_USER: emailUser || 'NOT SET',
      EMAIL_PASS: emailPass ? '***set***' : 'NOT SET',
      FAST2SMS: fast2sms ? '***set***' : 'NOT SET'
    });
  }

  try {
    await sendEmailOTP(emailUser, '123456'); // send test OTP to yourself
    res.json({ success: true, message: `Test email sent to ${emailUser}` });
  } catch (err) {
    res.json({ success: false, error: err.message, code: err.code });
  }
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
    // Log error details if email failed
    if (!emailSent) {
      console.error('Email failed:', results[0].reason?.message || results[0].reason);
    }
    console.log('OTP send — email:', emailSent, '| sms:', smsSent, '| otp:', otp);
    res.json({
      success: true,
      message: `OTP sent${emailSent ? ' to email' : ' (email failed, use Master OTP)'}${smsSent ? ' & SMS' : ''}`,
      emailSent,
      smsSent
    });
  } catch (err) {
    console.error('OTP send error:', err);
    res.json({ success: false, message: 'Failed to send OTP', error: err.message });
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
