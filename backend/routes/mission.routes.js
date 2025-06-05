const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/jwt');
const {
  getDailyMissions,
  handleEvent
} = require('../controllers/mission.controller');

router.get('/daily', verifyToken, getDailyMissions);
router.post('/:id/event', verifyToken, handleEvent);

module.exports = router;