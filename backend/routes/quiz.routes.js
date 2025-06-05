const express = require('express');
const router = express.Router();
const {
    getActiveQuizForUser,
    getUserQuizStatus,
    submitUserAttempt
} = require('../controllers/quiz.controller');
const verifyToken = require('../middlewares/jwt');

router.get('/active', verifyToken, getActiveQuizForUser);
router.get('/status', verifyToken, getUserQuizStatus);
router.post('/submit', verifyToken, submitUserAttempt);

module.exports = router;