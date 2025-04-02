const Species = require('../models/Species');
const clusterController = require('./cluster.controller');
const { getGbifIdsForSpecies,
  getUniqueLocations,
  getUniqueReferences,
  getMediaForSpecies,
  getCommonNameForSpecies,
  getDescriptionForSpecies
} = require('../services/gbif.service');

exports.populateSpecies = async (req, res) => {
  try {
    const requiredFields = {
      taxon_id: 'Taxon ID es requerido',
      scientific_name: 'Nombre científico es requerido',
      category: 'Categoría IUCN es requerida'
    };
    
    // Validar campos obligatorios
    const missingFields = Object.entries(requiredFields)
    .filter(([field]) => !req.body[field])
    .map(([_, message]) => message);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        details: missingFields
      });
    }
    
    // Establecer valores por defecto
    const defaultTaxonomy = {
      kingdom: 'Unknown',
      phylum: 'Unknown',
      class: 'Unknown',
      order: 'Unknown',
      family: 'Unknown',
      genus: 'Unknown'
    };
    
    // Obtener datos de GBIF
    const taxonId = req.body.taxon_id.toString().trim();
    const gbifIds = await getGbifIdsForSpecies(taxonId);
    
    const [locations, references, media, common_name, description] = await Promise.all([
      getUniqueLocations(gbifIds),
      getUniqueReferences(gbifIds),
      getMediaForSpecies(gbifIds),
      getCommonNameForSpecies(gbifIds),
      getDescriptionForSpecies(req.body.scientific_name),
    ]);
    
    // Crear especie con valores por defecto
    const newSpecies = await Species.create({
      ...req.body,
      ...defaultTaxonomy,
      kingdom: req.body.kingdom || defaultTaxonomy.kingdom,
      phylum: req.body.phylum || defaultTaxonomy.phylum,
      class: req.body.class || defaultTaxonomy.class,
      order: req.body.order || defaultTaxonomy.order,
      family: req.body.family || defaultTaxonomy.family,
      genus: req.body.genus || defaultTaxonomy.genus,
      gbifIds: gbifIds.length > 0 ? gbifIds : [],
      locations,
      references,
      media,
      common_name,
      description,
    });
    
    const isValidLocation = locations.every(loc => 
      /^[A-Z]{2}$/.test(loc.country) && 
      ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'].includes(loc.continent)
    );
    
    if (!isValidLocation) {
      throw new Error('Formato de ubicación inválido');
    }
    
    await clusterController.updateClusterForSpecies(newSpecies);
    
    res.status(201).json(newSpecies);
    
  } catch (error) {
    console.error('[ERROR] Detalles:', {
      message: error.message,
      body: req.body,
      stack: error.stack
    });
    
    const errorDetails = error.code === 11000
    ? [{ message: 'Taxon ID ya existe en la base de datos' }]
    : error.errors 
    ? Object.values(error.errors).map(e => ({ field: e.path, message: e.message }))
    : [{ message: error.message }];
    
    res.status(400).json({ 
      error: 'Error al crear especie',
      details: errorDetails 
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