const express = require('express');
const User = require('../models/User');
const router = express.Router();

router.get('/users', async (req, res) => {
  const users = await User.find().select('username password userType mobile email address createdAt');
  res.json(users);
});

router.post('/register', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.json({ success: true, userId: user._id });
  } catch (err) {
    res.json({ success: false, message: 'User already exists' });
  }
});

router.post('/login', async (req, res) => {
  const user = await User.findOne({ username: req.body.username, password: req.body.password });
  console.log('Login attempt for:', req.body.username);
  console.log('User found:', user);
  if (user) {
    const response = { 
      success: true, 
      userId: user._id, 
      username: user.username, 
      userType: user.userType, 
      mobile: user.mobile, 
      email: user.email, 
      address: user.address 
    };
    console.log('Sending response:', response);
    res.json(response);
  } else {
    res.json({ success: false, message: 'Invalid credentials' });
  }
});

module.exports = router;
