require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const speciesRoutes = require('./routes/species.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexión a MongoDB
connectDB();

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/species', speciesRoutes);

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Algo salió mal en el servidor' });
});

app.listen(PORT, () => {
  console.log(`## Server running on http://localhost:${PORT}`);
});