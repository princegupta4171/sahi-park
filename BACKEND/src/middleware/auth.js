const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sahi_park_secret_change_in_prod';

const generateToken = (user) =>
  jwt.sign({ userId: user._id, username: user.username, userType: user.userType }, JWT_SECRET, { expiresIn: '7d' });

const verifyToken = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = { generateToken, verifyToken };
