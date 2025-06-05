const express = require('express');
const router = express.Router();
const {
  //populateSpecies,
  getAllSpecies,
  getSpeciesById,
  getSpeciesByCountry,
  searchSpecies,
  updateSpeciesStatusFromAPI
} = require('../controllers/species.controller');

router.post('/update-status', updateSpeciesStatusFromAPI);
router.get('/country/:country', getSpeciesByCountry);
router.get('/search', searchSpecies);
router.get('/:id', getSpeciesById);
router.get('/', getAllSpecies);
//router.post('/', populateSpecies);

module.exports = router;