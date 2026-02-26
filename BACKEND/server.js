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

app.listen(3000, '0.0.0.0', () => console.log('Server running on port 3000'));

module.exports = app;
