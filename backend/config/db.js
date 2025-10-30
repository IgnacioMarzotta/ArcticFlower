const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    let mongoURI;

    switch (process.env.NODE_ENV) {
      case 'test':
        mongoURI = process.env.MONGODB_LOCAL_URI_TEST;
        break;
      case 'production':
        mongoURI = process.env.MONGODB_PROD_URI;
        break;
      default:
        mongoURI = process.env.MONGODB_LOCAL_URI;
        break;
    }

    if (!mongoURI) {
      throw new Error(`[config/db.js] MongoDB URI not defined for NODE_ENV=${process.env.NODE_ENV}`);
    }

    console.log(`## Connecting to MongoDB in env: ${process.env.NODE_ENV || 'development'}`);
    await mongoose.connect(mongoURI);
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

mongoose.connection.on('connected', () => console.log('## Connected to Mongoose'));
mongoose.connection.on('error', err => console.error(`Mongoose error: ${err}`));

module.exports = connectDB;