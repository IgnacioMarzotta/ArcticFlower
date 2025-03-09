const Species = require('../models/Species');
const GeoService = require('../services/geo.service');
const clusterController = require('./cluster.controller');

/**
 * Crea una especie, recibiendo en el request un campo "country" que es una cadena con codigos de pais separados por comas (por ejemplo: "CA,AU,BR").
 * Para cada pais se genera una ubicacion (latitud y longitud) utilizando el poligono del pais (si está disponible) o la coordenada central como fallback.
**/
exports.createSpecies = async (req, res) => {
  try {
    const { country, ...speciesData } = req.body;
    if (!country) {
      return res.status(400).json({ error: 'El campo country es obligatorio' });
    }
    
    const countryCodes = country.split(',').map(c => c.trim().toUpperCase());
    console.log("[createSpecies] countryCodes: ", countryCodes);
    
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

    //Actualizar clusters asociados
    await clusterController.updateClusterForSpecies(newSpecies);
    console.log("Clusters actualizados correctamente");

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
      .select('_id common_name category locations')
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

exports.getSpeciesByCountry = async (req, res) => {
  try {
    const country = req.params.country.toUpperCase();
    const species = await Species.find({ "locations.country": country });

    if (!species || species.length === 0) {
      return res.status(404).json({ error: 'No se encontraron especies para este país' });
    }

    res.json(species);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener especies por país' });
  }
};

exports.searchSpecies = async (req, res) => {
  console.log('[SEARCH] Query parameters:', req.query);
  
  try {
    const { q: searchTerm, limit = 50 } = req.query;
    console.log(`[SEARCH] Término: "${searchTerm}", Límite: ${limit}`);

    // Validación mejorada
    if (!searchTerm || searchTerm.trim().length < 3) {
      console.log('[SEARCH] Error: Término muy corto');
      return res.status(400).json({ 
        error: 'El término debe tener al menos 3 caracteres',
        code: 'SHORT_QUERY'
      });
    }

    // Consulta optimizada
    const query = {
      $or: [
        { common_name: new RegExp(searchTerm, 'i') },
        { scientific_name: new RegExp(searchTerm, 'i') },
        { 'locations.country': new RegExp(searchTerm, 'i') }
      ]
    };

    console.log('[SEARCH] Consulta MongoDB:', JSON.stringify(query));
    
    const results = await Species.find(query)
      .select('_id common_name scientific_name category locations')
      .limit(Number(limit))
      .lean()
      .maxTimeMS(5000);

    console.log(`[SEARCH] Encontrados ${results.length} documentos`);

    // Formateo seguro
    const formattedResults = results.flatMap(species => 
      (species.locations || []).map(loc => ({
        id: species._id.toString(),
        lat: loc?.lat || 0,
        lng: loc?.lng || 0,
        common_name: species.common_name || 'Sin nombre',
        scientific_name: species.scientific_name || 'Sin nombre científico',
        category: species.category || 'ND',
        country: loc?.country || 'XX'
      }))
    );

    console.log('[SEARCH] Resultados formateados:', formattedResults.length);
    res.json(formattedResults);

  } catch (error) {
    console.error('[SEARCH ERROR]', {
      message: error.message,
      stack: error.stack,
      query: req.query
    });
    res.status(500).json({ 
      error: 'Error interno',
      code: 'SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};