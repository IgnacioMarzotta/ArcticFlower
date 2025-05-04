const Report = require('../models/Report');

//Funcion basica de creacion de reporte. Almacena id del usuario que genero el reporte, si es que existe. Almacena la id de la especie reportada, si existe. Ademas, almacena un mensaje y tipo de reporte.
exports.createReport = async (req, res) => {
    try {
        const { message, type, species } = req.body;
        const userId = req.user ? req.user.id : null;
        const report = new Report({ 
            user: userId, 
            message, 
            type, 
            species: species || null 
        });
        await report.save();
        res.status(201).json(report);
    } catch (err) {
        console.error("[report.controller - createReport] Error creating report:", err);
        res.status(500).json({ error: 'Error creating report' });
    }
};

exports.getAllReports = async (req, res) => {
    try {
        const reports = await Report.find().populate('user','email');
        res.json(reports);
    } catch (err) {
        console.error(err);
        console.error("[report.controller - getAllReports] Error getting all reports:", err);
        res.status(500).json({ error: 'Error getting all reports' });
    }
};