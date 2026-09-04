const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI environment variable not set');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('MongoDB connected successfully');
};

module.exports = connectDB;
