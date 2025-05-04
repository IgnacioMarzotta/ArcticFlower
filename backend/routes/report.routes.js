const express = require('express');
const router = express.Router();
const {
    createReport,
    getAllReports
} = require('../controllers/report.controller');

router.post('/', createReport);
router.get('/', getAllReports);

module.exports = router;