const router = require('express').Router();
const verifyToken = require('../middlewares/jwt');
const { 
    addFavorite,
    removeFavorite,
    getFavoritesByUser
} = require('../controllers/favorite.controller');

router.post('/', verifyToken, addFavorite);
router.get('/', verifyToken, getFavoritesByUser);
router.delete('/', verifyToken, removeFavorite);

module.exports = router;