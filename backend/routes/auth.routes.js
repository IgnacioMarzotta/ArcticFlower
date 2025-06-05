const express = require('express');
const router = express.Router();
const { 
    register, 
    login,
    getProfile,
    refresh,
    logout
} = require('../controllers/user.controller');
const verifyToken = require('../middlewares/jwt');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/profile', verifyToken, getProfile);
router.post('/refresh', refresh);

module.exports = router;