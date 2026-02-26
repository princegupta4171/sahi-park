const express = require('express');
const authRoutes = require('./routes/auth');
const parkingRoutes = require('./routes/parking');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.use(authRoutes);
app.use(parkingRoutes);

module.exports = app;
