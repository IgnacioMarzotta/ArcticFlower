const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/jwt');
const {
    createReport,
    getAllReports,
    getReportsByUser
} = require('../controllers/report.controller');

router.post('/', verifyToken, createReport);
router.get('/', getAllReports);
router.get('/user', verifyToken, getReportsByUser);

module.exports = router;