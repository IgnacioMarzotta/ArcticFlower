require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const speciesRoutes = require('./routes/species.routes');
const clusterRoutes = require('./routes/cluster.routes');
const reportRoutes = require('./routes/report.routes');
const favRoutes = require('./routes/favorite.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexion a MongoDB
connectDB();

// Rutas principales
app.use('/api/auth', authRoutes);
app.use('/api/species', speciesRoutes);
app.use('/api/clusters', clusterRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/favorites', favRoutes);

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Algo salió mal en el servidor' });
});

app.listen(PORT, () => {
  console.log(`## Server running on http://localhost:${PORT}`);
});