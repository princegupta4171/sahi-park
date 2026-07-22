const app = require('./src/app');
const connectDB = require('./src/config/db');
const Parking = require('./src/models/Parking');

connectDB();

// Initialize 10 parking spaces
Parking.countDocuments().then(count => {
  if (count === 0) {
    for (let i = 1; i <= 10; i++) {
      new Parking({ spaceNumber: i }).save();
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

module.exports = app;
