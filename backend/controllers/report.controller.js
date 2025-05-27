const Report = require('../models/Report');


exports.createReport = async (req, res) => {
    try {
        const { message, type, species } = req.body;
        console.log(req.body)
        const userId = req.userId || null;
        console.log("[report.controller - createReport] Creating report with userId:", userId, "message:", message, "type:", type, "species:", species);
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


exports.getReportsByUser = async (req, res) => {
  try {
    const userId = req.userId;
    const reports = await Report
      .find({ user: userId })
      .populate('species', 'common_name');
    res.json(reports);
  } catch (err) {
    console.error("[report.controller - getReportsByUser] Error:", err);
    res.status(500).json({ error: 'Error fetching your reports' });
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