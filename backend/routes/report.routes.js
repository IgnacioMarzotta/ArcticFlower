const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/jwt');
const isAdmin = require('../middlewares/admin');
const {
    createReport,
    getAllReports,
    getReportsByUser,
    updateReportStatus,
    deleteReport
} = require('../controllers/report.controller');

router.post('/', verifyToken, createReport);
router.get('/', verifyToken, isAdmin, getAllReports);
router.get('/user', verifyToken, getReportsByUser);
router.patch('/:id/status', verifyToken, isAdmin, updateReportStatus);
router.delete('/:id', verifyToken, isAdmin, deleteReport);

module.exports = router;