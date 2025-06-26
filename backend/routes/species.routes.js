const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/jwt');
const isAdmin = require('../middlewares/admin'); 
const {
  //populateSpecies,
  getAllSpecies,
  getSpeciesById,
  getSpeciesByCountry,
  searchSpecies,
  updateSpeciesStatusFromAPI,
  deleteSpecies,
  editSpecies,
  createSpecies
} = require('../controllers/species.controller');

router.post('/update-status', updateSpeciesStatusFromAPI);
router.get('/country/:country', getSpeciesByCountry);
router.get('/search', searchSpecies);
router.get('/:id', getSpeciesById);

router.get('/', verifyToken, isAdmin, getAllSpecies);
router.patch('/:id', verifyToken, isAdmin, editSpecies);
router.delete('/:id', verifyToken, isAdmin, deleteSpecies);
router.post('/admin-create', verifyToken, isAdmin, createSpecies);

//router.post('/', populateSpecies);

module.exports = router;