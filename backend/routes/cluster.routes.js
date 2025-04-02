const express = require('express');
const router = express.Router();
const { updateClusterForSpecies, getSpeciesClusters } = require('../controllers/cluster.controller');

router.post('/', updateClusterForSpecies);
router.get('/', getSpeciesClusters);

module.exports = router;