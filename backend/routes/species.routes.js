const express = require('express');
const router = express.Router();
const {
  createSpecies,
  getAllSpecies,
  getSpeciesById,
  getSpeciesByCountry
} = require('../controllers/species.controller');

router.get('/', getAllSpecies);
router.get('/:id', getSpeciesById);
router.post('/', createSpecies);
router.get('/country/:country', getSpeciesByCountry);

module.exports = router;