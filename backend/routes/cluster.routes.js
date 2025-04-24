const express = require('express');
const router = express.Router();
const { 
    updateClusterForSpecies,
    getSpeciesClusters,
    updateAllClusterOccurrences,
    updateClusterStatusFromAPI 
} = require('../controllers/cluster.controller');

router.post('/update-occurrences', updateAllClusterOccurrences);
router.get('/:countryCode/gbif', updateClusterStatusFromAPI);
router.post('/', updateClusterForSpecies);
router.get('/', getSpeciesClusters);

module.exports = router;