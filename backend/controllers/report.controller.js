const Report = require('../models/Report');


//Funcion encargada de crear un reporte
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


//Funcion para obtener los reportes generados por un usuario para mostrarlos en su perfil
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


//Funcion para obtener todos los reportes para el panel de adminsitrador
exports.getAllReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { resolved } = req.query; 
    
    const query = {};
    if (resolved === 'true' || resolved === 'false') {
      query.resolved = resolved === 'true';
    }

    const reportsPromise = Report.find(query).populate('user', 'email').sort({ createdAt: -1 }).skip(skip).limit(limit);
      
    const countPromise = Report.countDocuments(query);

    const [reports, totalReports] = await Promise.all([reportsPromise, countPromise]);
    const totalPages = Math.ceil(totalReports / limit);

    res.json({
      reports,
      totalPages,
      currentPage: page,
      totalReports
    });

  } catch (err) {
    console.error("[report.controller - getAllReports] Error getting all reports:", err);
    res.status(500).json({ error: 'Error getting all reports' });
  }
};


//Funcion para actualizar el Status del reporte
exports.updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolved } = req.body;

    if (typeof resolved !== 'boolean') {
      return res.status(400).json({ error: "El campo 'resolved' debe ser un valor booleano (true/false)." });
    }

    const updatedReport = await Report.findByIdAndUpdate(
      id, 
      { resolved: resolved }, 
      { new: true }
    ).populate('user', 'email');

    if (!updatedReport) {
      return res.status(404).json({ error: 'Reporte no encontrado.' });
    }

    res.json(updatedReport);

  } catch (err) {
    console.error("[report.controller - updateReportStatus] Error:", err);
    res.status(500).json({ error: 'Error actualizando el reporte' });
  }
};


//Funcion para eliminar un reporte
exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedReport = await Report.findByIdAndDelete(id);

    if (!deletedReport) {
      return res.status(404).json({ error: 'Reporte no encontrado.' });
    }

    res.status(200).json({ message: 'Reporte eliminado exitosamente.' });

  } catch (err) {
    console.error("[report.controller - deleteReport] Error:", err);
    res.status(500).json({ error: 'Error eliminando el reporte' });
  }
};