const express = require('express');
const router = express.Router();
const {
  createSpecies,
  getAllSpecies,
  getSpeciesById,
  getSpeciesByCountry,
  searchSpecies
} = require('../controllers/species.controller');

router.get('/country/:country', getSpeciesByCountry);
router.get('/search', searchSpecies);

router.get('/:id', getSpeciesById);

router.get('/', getAllSpecies);
router.post('/', createSpecies);

module.exports = router;