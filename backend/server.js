require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

const authRoutes    = require('./routes/auth.routes');
const speciesRoutes = require('./routes/species.routes');
const clusterRoutes = require('./routes/cluster.routes');
const reportRoutes  = require('./routes/report.routes');
const favRoutes     = require('./routes/favorite.routes');
const missionRoutes = require('./routes/mission.routes');
const quizRoutes    = require('./routes/quiz.routes');
const userRoutes = require('./routes/user.routes');

const app = express();

// Middlewares
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// MongoDB Connection
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/species', speciesRoutes);
app.use('/api/clusters', clusterRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/favorites', favRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/users', userRoutes)

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Algo salió mal en el servidor' });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`## Server running on http://localhost:${PORT}`);
  });
}