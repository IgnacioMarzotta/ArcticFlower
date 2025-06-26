const express = require('express');
const router = express.Router();
const { 
    getAllUsersForAdmin,
    updateUserPermissions,
    deleteUser
} = require('../controllers/user.controller');
const verifyToken = require('../middlewares/jwt');
const isAdmin = require('../middlewares/admin');

router.get('/', verifyToken, isAdmin, getAllUsersForAdmin);
router.patch('/:id/permissions', verifyToken, isAdmin, updateUserPermissions);
router.delete('/:id', verifyToken, isAdmin, deleteUser);

module.exports = router;