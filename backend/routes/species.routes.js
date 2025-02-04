const express = require('express');
const router = express.Router();
const {
  createSpecies,
  getAllSpecies,
  getSpeciesById
} = require('../controllers/species.controller');

router.post('/', createSpecies);
router.get('/', getAllSpecies);
router.get('/:id', getSpeciesById);

module.exports = router;