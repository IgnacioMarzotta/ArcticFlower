const express = require('express');
const router = express.Router();
const { 
    register, 
    login,
    getProfile,
    refresh,
    logout,
    checkUsername,
    checkEmail,
    startGoogleAuth,
    googleCallback
} = require('../controllers/user.controller');
const verifyToken = require('../middlewares/jwt');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/profile', verifyToken, getProfile);
router.post('/refresh', refresh);
router.get('/check-username/:username', checkUsername);
router.get('/check-email/:email', checkEmail);
router.get('/google', startGoogleAuth);
router.get('/google/callback', googleCallback);

module.exports = router;