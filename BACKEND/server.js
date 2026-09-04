const app = require('./src/app');
const connectDB = require('./src/config/db');
const Parking = require('./src/models/Parking');

const PORT = process.env.PORT || 3000;

connectDB().then(async () => {
  const count = await Parking.countDocuments();
  if (count === 0) {
    for (let i = 1; i <= 10; i++) {
      await new Parking({ spaceNumber: i }).save();
    }
  }
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});

module.exports = app;
