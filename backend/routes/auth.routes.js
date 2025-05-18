const express = require('express');
const router = express.Router();
const { 
    register, 
    login,
    getProfile,
} = require('../controllers/user.controller');
const verifyToken = require('../middlewares/jwt');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', verifyToken, getProfile);

module.exports = router;