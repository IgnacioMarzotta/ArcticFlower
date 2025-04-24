const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    console.log('## Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, { });
    console.log('## Conectado a MongoDB');
  } catch (error) {
    console.error('Error de conexión a MongoDB:', error.message);
    process.exit(1);
  }
};

mongoose.connection.on('connected', () => {
  console.log('## Conectado a Mongoose');
});

mongoose.connection.on('error', (err) => {
  console.error(`Error de Mongoose: ${err}`);
});

module.exports = connectDB;