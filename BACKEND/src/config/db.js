const mongoose = require('mongoose');

const connectDB = async () => {
  await mongoose.connect('mongodb+srv://prince:EmoyTxeFxYjqu83I@prince.cj3zvhq.mongodb.net/parking');
  console.log('MongoDB connected');
};

module.exports = connectDB;
