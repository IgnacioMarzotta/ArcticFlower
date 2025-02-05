const Species = require('../models/Species');
const GeoService = require('../services/geo.service');

/**
 * Crea una especie, recibiendo en el request un campo "country" que es una cadena 
 * con códigos de país separados por comas (por ejemplo: "CA,AU,BR").
 * Para cada país se genera una ubicación (latitud y longitud) utilizando el polígono 
 * del país (si está disponible) o la coordenada central como fallback.
 */
exports.createSpecies = async (req, res) => {
  try {
    const { country, ...speciesData } = req.body;
    if (!country) {
      return res.status(400).json({ error: 'El campo country es obligatorio' });
    }
    
    const countryCodes = country.split(',').map(c => c.trim().toUpperCase());
    console.log("[createSpecies] countryCodes: ", countryCodes);
    
    // Usamos la instancia importada (no se instancia con new)
    const geoService = GeoService;
    
    const locations = countryCodes.map(code => {
      let position;
      const polygon = geoService.getCountryPolygon(code);
      if (polygon) {
        position = geoService.generateRandomPointInPolygon(polygon);
        console.log("[createSpecies] position: ", position);
      } else {
        const center = geoService.getCountryCoordinates(code);
        console.log("[createSpecies] center: ", center);
        if (center) {
          position = center;
        } else {
          return null;
        }
      }
      return { country: code, lat: position.lat, lng: position.lng };
    }).filter(loc => loc !== null);
    
    const newSpecies = new Species({ ...speciesData, locations });
    console.warn("[createSpecies] newSpecies: ", newSpecies);
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