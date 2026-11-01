# 🅿️ Sahi Park

A smart parking space management platform connecting parking space providers with renters across India.

## 🌐 Live Demo

- **Frontend**: [Vercel](https://sahi-park.vercel.app)
- **Backend API**: [https://sahi-park-backend.onrender.com](https://sahi-park-backend.onrender.com)

---

## ✨ Features

- **For Renters** — Search and book nearby parking spaces using GPS location
- **For Providers** — List your parking space on the map and earn money
- **OTP Verification** — Email OTP on signup via Brevo Transactional Email API
- **Email Notifications** — Provider gets email when space is booked/released
- **Admin Panel** — Manage all users and parking spaces
- **Real-time Availability** — Live parking space status updates
- **3D Dark UI** — Glassmorphism dark theme with animated elements
- **Secure Authentication** — JWT tokens, bcrypt passwords, separate login for renters and providers

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js + Vite |
| Backend | Node.js / Express.js |
| Database | MongoDB Atlas |
| Maps | Leaflet.js + OpenStreetMap |
| Auth | JWT + bcrypt |
| Email OTP | Brevo (Transactional Email API) |
| Security | Helmet, CORS whitelist, Rate Limiting |
| Logging | Morgan |
| Error Tracking | Sentry |
| CI/CD | GitHub Actions |
| Deployment | Vercel (Frontend), Render (Backend) |

---

## 📁 Project Structure

```
sahi-park/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI/CD
├── FRONTEND/
│   └── FRONTEND/
│       ├── src/
│       │   ├── App.jsx          # Main React component
│       │   ├── App.css          # Global styles (3D dark theme)
│       │   ├── LocationPickerMap.jsx
│       │   └── NearbyParkingMap.jsx
│       └── package.json
└── BACKEND/
    ├── server.js
    ├── package.json
    └── src/
        ├── app.js               # Express app, middleware, rate limiting
        ├── config/
        │   ├── db.js            # MongoDB connection
        │   └── otp.js           # OTP generation & email
        ├── middleware/
        │   └── auth.js          # JWT verify middleware
        ├── models/
        │   ├── User.js          # User schema (bcrypt password)
        │   └── Parking.js       # Parking schema (GeoJSON)
        └── routes/
            ├── auth.js          # Register, Login, OTP routes
            └── parking.js       # Parking space routes + notifications
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- MongoDB Atlas account (or local MongoDB)
- Gmail account with App Password enabled

### Backend Setup

```bash
cd BACKEND
npm install
```

Create a `.env` file in `BACKEND/` (see `.env.example`):

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_long_random_secret
ALLOWED_ORIGINS=http://localhost:5173
EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=your_16_char_app_password
BREVO_API_KEY=your_brevo_api_key
SENTRY_DSN=your_sentry_dsn
```

```bash
npm start
```

### Frontend Setup

```bash
cd FRONTEND/FRONTEND
npm install
```

Create a `.env` file in `FRONTEND/FRONTEND/`:

```env
VITE_API_URL=http://localhost:3000
```

```bash
npm run dev
```

---

## 🔐 Security

- **Passwords** — Hashed with bcrypt (salt rounds: 10)
- **Auth** — JWT tokens (7 day expiry), stored in localStorage
- **Rate Limiting** — Auth routes: 20 req/15min, API: 60 req/min
- **CORS** — Whitelist via `ALLOWED_ORIGINS` env variable
- **Headers** — Helmet.js sets 15+ security HTTP headers
- **Error Tracking** — Sentry captures all unhandled errors

---

## 🔐 OTP System

- On signup, a 6-digit OTP is sent to the user's **email** via **Brevo API**
- OTP is valid for **5 minutes**
- Uses **Brevo Transactional Email API** for email delivery
- Master OTP `123456` available for testing

---

## 🗺️ API Endpoints

All routes available on both `/route` (legacy) and `/api/v1/route` (versioned).

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/v1/send-otp` | Send OTP to email |
| POST | `/api/v1/verify-otp` | Verify OTP |
| POST | `/api/v1/register` | Register new user |
| POST | `/api/v1/login` | User login (returns JWT) |
| GET | `/users` | Get all users (admin) |
| POST | `/api/v1/provide` | Add parking space |
| GET | `/api/v1/spaces` | Get all parking spaces |
| GET | `/api/v1/nearby-spaces` | Get nearby spaces by GPS |
| POST | `/api/v1/book` | Book a parking space |
| POST | `/api/v1/payment` | Process payment |
| POST | `/api/v1/release` | Release a parking space |

---

## 🔄 CI/CD Pipeline

GitHub Actions runs on every push to `main`:
- **Backend** — `npm ci` + app load test
- **Frontend** — `npm ci` + `npm run build`

---

## 📊 Monitoring & Hosting (Recommended Free Stack)

| Layer | Service | Cost |
|-------|---------|------|
| Frontend | Vercel | Free |
| Backend | Render | Free |
| Database | MongoDB Atlas M0 | Free |
| Error Tracking | Sentry | Free |
| Uptime Monitor | UptimeRobot | Free |

---

## 👥 Team

| Role | Name |
|------|------|
| Founder & Developer | Prince Gupta |
| Co-Founder & Developer | Satya Dubey |
| Tester | Sachin Chauhan |
| Customer Support | Pritsh Mall — 📞 8853308557 |

---

## 📄 License

All rights reserved © 2025 Sahi Park
