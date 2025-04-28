const express = require('express');
const router = express.Router();
const { 
    updateClusterForSpecies,
    getSpeciesClusters,
    updateAllClusterOccurrences,
    updateClusterStatusFromAPI 
} = require('../controllers/cluster.controller');

router.post('/gbif', updateClusterStatusFromAPI);
router.post('/', updateClusterForSpecies);
router.get('/', getSpeciesClusters);
router.post('/update-occurrences', updateAllClusterOccurrences);

module.exports = router;