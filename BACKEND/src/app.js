require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const Sentry = require('@sentry/node');

const authRoutes = require('./routes/auth');
const parkingRoutes = require('./routes/parking');

const app = express();

// ── Sentry (error tracking) ────────────────────────────────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.2 });
  app.use(Sentry.Handlers.requestHandler());
}

// ── Security headers ───────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS — whitelist frontend origin ──────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// ── Logging ────────────────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body parser ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Rate limiting ──────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { success: false, message: 'Too many requests. Please slow down.' }
});

app.use('/login', authLimiter);
app.use('/register', authLimiter);
app.use('/send-otp', authLimiter);
app.use('/api/v1/login', authLimiter);
app.use('/api/v1/register', authLimiter);
app.use('/api/v1/send-otp', authLimiter);
app.use('/api/', apiLimiter);

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use(authRoutes);
app.use(parkingRoutes);

// ── Sentry error handler ───────────────────────────────────────────────────────
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS')
    return res.status(403).json({ success: false, message: 'CORS error: origin not allowed' });
  res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = app;
