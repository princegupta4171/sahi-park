const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/parking';
  try {
    await mongoose.connect(uri);
    console.log(`MongoDB connected to: ${uri.includes('127.0.0.1') ? 'local database' : 'remote database'}`);
  } catch (err) {
    if (uri !== 'mongodb://127.0.0.1:27017/parking') {
      console.log('Remote MongoDB connection failed. Trying local...');
      try {
        await mongoose.connect('mongodb://127.0.0.1:27017/parking');
        console.log('MongoDB connected to local database');
      } catch (localErr) {
        console.error('All MongoDB connection attempts failed:', localErr);
        process.exit(1);
      }
    } else {
      console.error('Local MongoDB connection failed:', err);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
