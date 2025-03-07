const express = require('express');
const router = express.Router();
const { updateClusterForSpeciesEndpoint, getSpeciesClusters } = require('../controllers/cluster.controller');

router.post('/', updateClusterForSpeciesEndpoint);
router.get('/', getSpeciesClusters);

module.exports = router;