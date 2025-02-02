const Species = require('../models/Species');

exports.createSpecies = async (req, res) => {
  try {
    const newSpecies = new Species(req.body);
    await newSpecies.save();
    res.status(201).json(newSpecies);
  } catch (error) {
    res.status(400).json({
      error: error.message,
      details: error.errors
    });
  }
};

exports.getAllSpecies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const species = await Species.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Species.countDocuments();

    res.json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      species
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener especies' });
  }
};

exports.getSpeciesById = async (req, res) => {
  try {
    const species = await Species.findById(req.params.id);
    if (!species) {
      return res.status(404).json({ error: 'Especie no encontrada' });
    }
    res.json(species);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener especie' });
  }
};