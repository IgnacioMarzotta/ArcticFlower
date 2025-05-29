const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.NODE_ENV === 'test' 
      ? process.env.MONGO_URI_TEST 
      : process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('[config/db.js] MongoDB URI for current enviroment is not defined.');
    }

    console.log(`## Connecting to MongoDB in env: ${process.env.NODE_ENV || 'development'}`);
    await mongoose.connect(mongoURI, { });
    console.log('## Connected to MongoDB');

  } catch (error) {
    console.error('MongoDB Connection error:', error.message);
    process.exit(1);
  }
};

mongoose.connection.on('connected', () => {
  console.log('## Connected to Mongoose');
});

mongoose.connection.on('error', (err) => {
  console.error(`Mongoose error: ${err}`);
});

module.exports = connectDB;