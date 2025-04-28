const Species = require('../models/Species');
const clusterController = require('./cluster.controller');
const { getGbifIdsForSpecies,
  getUniqueLocations,
  getUniqueReferences,
  getMediaForSpecies,
  getCommonNameForSpecies,
  getDescriptionForSpecies
} = require('../services/populate.service');

const {
  getGbifSpeciesVernacularName,
  getGbifSpeciesRedListCategory,
  getGbifSpeciesMedia
} = require('../services/gbif.service');

const { 
  getIucnSpeciesDescriptionByScientificName,
  getIucnSpeciesAssessmentById
} = require('../services/iucn.service');

const sanitizeHtml = require('sanitize-html');


/**
* Funcion deprecada, utilizada en la creacion de la base de datos de produccion con el dataset original. Centraliza toda la logica de creacion de especie, consultando las distintas bases de datos utilizadas para obtener todos los datos de las especies originales, como media, description, locations y mas.
*/
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


/**
* Funcion general sin uso actual, se encarga de obtener y devolver todas las especies de la base de datos, paginadas y ordenadas por fecha de creacion.
*/
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


/**
* Funcion general sin uso actual, se encarga de obtener y devolver una especie en particular de la base de datos, a partir de su id.
*/
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


/**
* Funcion general utilizada en el front-end, se encarga de obtener y devolver todas las especies de un pais en particular, utilizando countryCode para cargar las especies y devolverlas para mostrar en el globo.
*/
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


/**
* Funcion general utilizada en el front-end, se encarga de buscar especies utilizando los terminos recibidos desde el front, buscando especies segun su common_name o scientific_name.
*/
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


/**
* Funcion encargada de crearuna nueva especie en la base de datos. Esta funcion es llamada principalmente desde cluster.controller, cuando se encuentra una especie nueva en el pais. Se encarga de almacenar los campos obligatorios y luego llama a la funcion updateSpeciesStatusFromAPI para obtener media, description y common_name.
* @returns {Object} resultado con los nuevos datos a actualizar en la base de datos.
*/
exports.createSpecies = async (req, res) => {
  //Desde cualquier lugar, deberia llegar minimo taxonKey, iucnRedListCategory, species (scientific_name) y genus. Almaceno esos datos, y con ellos se consulta los endpoints de IUCN y GBIF a traves de updateSpeciesStatusFromAPI para obtener el resto de los datos. Adicionalmente, deberia llegar un location desde cluster.controller.
  try {
    const {
      taxon_id,
      scientific_name,
      category,
      kingdom, phylum, class: cls, order, family, genus,
      locations
    } = req.body;
    
    if (!taxon_id || !scientific_name || !category || !locations?.length) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para creación de especie' });
    }
    
    // 2) Crear documento inicial
    const newSpecie = await Species.create({
      taxon_id,
      scientific_name,
      category,
      kingdom, phylum, class: cls, order, family, genus,
      gbifIds: [],
      locations,
      media: [],
      references: [],
      common_name: 'Unknown',
      description: {}
    });
    
    // 3) Actualizar desde APIs (media, description, common_name, taxonomy si aplica)
    await exports.updateSpeciesStatusFromAPI({ body: { id: newSpecie._id, taxon_id, category } }, res);
    
    // 4) Responder con la especie creada
    return res.status(201).json(newSpecie);
    
  } catch (error) {
    console.error('[createSpecies] error:', error);
    return res.status(500).json({ error: error.message });
  }
};


/**
* 0. Funcion central encargada de actualizar la especie desde la API. Si el usuario hizo click en una especie y esa especie no ha sido actualizada en cierto tiempo, se llama a esta funcion para actualizarla. Entre esto, se actualiza su categoria, common_name, media y description.
* @returns {Object} resultado con los nuevos datos a actualizar en la base de datos.
*/
exports.updateSpeciesStatusFromAPI = async (req, res) => {
  try {
    const speciesData = req.body;
    const { id, taxon_id, category } = speciesData;
    console.log("[species.controller - updateSpeciesStatusFromAPI] Updating species: ", taxon_id);
    if (!id || !taxon_id) {
      return res.status(400).json({ error: 'Falta id o taxon_id' });
    }
    
    //1. Validar IUCN category
    console.log("[species.controller - updateSpeciesStatusFromAPI] 1. Validating category. Current: ", category);
    const categoryResult = await validateSpeciesIucnCategory(id, taxon_id);
    
    //2. Validar common_name
    console.log("[species.controller - updateSpeciesStatusFromAPI] 2. Validating vernacular names.");
    const vernacularResult = await validateVernacularName(id, taxon_id);
    
    //3. Validar media
    console.log("[species.controller - updateSpeciesStatusFromAPI] 3. Validating media");
    const mediaResult = await validateSpeciesMedia(id, taxon_id);
    
    //4. Validar description
    console.log("[species.controller - updateSpeciesStatusFromAPI] 4. Validating description");
    const descriptionResult = await validateSpeciesDescription(id);
    
    return res.json({
      message: 'Especie actualizada',
      category: categoryResult,
      vernacular: vernacularResult,
      media: mediaResult,
      description: descriptionResult,
    });
    
  } catch (error) {
    console.error('[species.controller - updateSpeciesStatusFromAPI] Error al actualizar estado de especie:', error);
    res.status(500).json({ error: 'Error interno al actualizar especie' });
  }
};


/**
* 1. Obtiene la categoría de la Lista Roja de IUCN desde GBIF y actualiza el campo category.
* @returns {Object} resultado con la categoría anterior y la nueva
*/
async function validateSpeciesIucnCategory(id, taxon_id) {
  //1.1 Busco la especie en la DB
  const species = await Species.findById(id);
  if (!species) throw new Error('Especie no encontrada');
  
  //1.2 Siempre actualizo el estado de la especie con el endpoint de GBIF
  const gbif = await getGbifSpeciesRedListCategory(taxon_id);
  const newCode = gbif.code;
  console.log("   [species.controller - validateSpeciesIucnCategory] New category: ", newCode);
  
  //1.3 Actualizo unicamente si la categoria nueva es distinta a la actual
  if (typeof newCode === 'string' && newCode !== species.category) {
    const before = species.category;
    species.category = newCode;
    await species.save();
    return { updated: true, field: 'category', before, after: newCode };
  }
  
  return { updated: false, field: 'category', current: species.category };
}


/**
* 2. Si la especie no tiene common_name o es 'Unknown', obtiene un vernacular name de GBIF y actualiza el documento.
* @returns {Object} resultado con el nuevo common_name o null si no cambió
*/
async function validateVernacularName(id, taxon_id) {
  //2.1 Busco la especie en la DB
  const species = await Species.findById(id);
  if (!species) throw new Error('Especie no encontrada');
  
  //2.2 Valido si la especie ya tiene un common_name, de ser asi, ignoro.
  if (species.common_name && species.common_name !== 'Unknown') {
    console.log("   [species.controller - validateSpeciesIucnCategory] Species already has common_name");
    return { updated: false, field: 'common_name', current: species.common_name };
  }
  
  //2.3 Si la especie no tiene common_name, obtengo una lista de los vernacularNames desde GBIF
  const gbif = await getGbifSpeciesVernacularName(taxon_id);
  
  //2.4 Obtengo el primer common_name en ingles, de no existir, guardo el primero de cualquier idioma
  const eng = gbif.results.find(n => n.language === 'eng');
  const pick = eng ? eng.vernacularName : gbif.results[0]?.vernacularName;
  if (pick) {
    const before = species.common_name;
    species.common_name = pick;
    await species.save();
    console.log("   [species.controller - validateSpeciesIucnCategory] New common_name: ", pick);
    return { updated: true, field: 'common_name', before, after: pick };
  }
  
  return { updated: false, field: 'common_name', current: species.common_name };
}


/**
* 3. Valida si existen medios para la especie. Si no tiene, consulto el endpoint de GBIF para obtener.
* @returns {Object} resultado con los nuevos registros de media para almacenar en el array.
*/
async function validateSpeciesMedia(id, taxon_id) {
  //3.1 Busco la especie en la DB
  const species = await Species.findById(id);
  if (!species) throw new Error('Especie no encontrada');
  
  //3.2 Si la especie ya tiene media asociada, ignoro.
  if (species.media && species.media.length > 0) {
    console.log("   [species.controller - validateSpeciesMedia] Species already has media.");
    return { updated: false, field: 'media', current: species.media.length };
  }
  
  //3.3 Si la especie no tiene media, obtengo una lista de los medios desde GBIF
  const gbif = await getGbifSpeciesMedia(taxon_id);
  const mappedMedia = gbif.results.map(media => ({
    type: media.type || 'unknown',
    format: media.format || 'unknown',
    identifier: media.identifier,
    title: media.title || '',
    description: media.description || '',
    creator: media.creator || '',
    contributor: '',
    publisher: media.publisher || '',
    rightsHolder: '',
    license: media.references || ''
  }));
  
  //3.4 Actualizo unicamente si hay algo que agregar
  if (mappedMedia.length > 0) {
    species.media = mappedMedia;
    console.log("   [species.controller - validateSpeciesMedia] Obtained new media. Total: ", mappedMedia.length);
    await species.save();
    return { updated: true, field: 'media', added: mappedMedia.length };
  }
  
  return { updated: false, field: 'media', added: 0 };
}


/**
* 4. Valida si existe desciption para la especie, si alguno de los campos esta vacio, consulta a IUCN por assessments que si tengan.
* @returns {Object} resultado con los nuevos campos description limpios para almacenar.
*/
async function validateSpeciesDescription(id) {
  
  //4.1-Busco la especie en la base de datos
  const species = await Species.findById(id);
  if (!species) {
    return { updated: false, reason: 'species not found' };
  }
  
  //4.2-Con la especie, rescato genus y scientific_name
  const { genus, scientific_name: sciName } = species;
  if (!genus || !sciName) {
    console.log("   [species.controller - validateSpeciesDescription]ERROR: Genus or scientific_name are missing:", { genus, sciName });
    return { updated: false, reason: 'No genus or scientific_name found' };
  }
  
  //4.3-Construyo el nombre científico para la búsqueda con genus y scientific_name
  const prefix = genus + ' ';
  const speciesPart = sciName.startsWith(prefix)
  ? sciName.slice(prefix.length)
  : sciName;
  
  //4.4-Llamo al endpoint de description para obtener una lista de los assessments mas recientes
  const data = await getIucnSpeciesDescriptionByScientificName(genus, speciesPart);
  
  //4.5-Tomo el assessment mas reciente y llamo al endpoint de assessment para obtener la documentación
  const firstAssessment = Array.isArray(data.assessments) && data.assessments[0];
  if (!firstAssessment) {
    console.log("   [species.controller - validateSpeciesDescription]WARN: Got no assessments from the IUCN API");
    return { updated: false, reason: '[species.controller - validateSpeciesDescription] No assessments found for this species.' };
  }
  const assessmentDetail = await getIucnSpeciesAssessmentById(firstAssessment.assessment_id);
  const doc = assessmentDetail.documentation || {};
  
  //4.6-Defino los campos que voy a reemplazar
  const mapping = {
    rationale: 'rationale',
    habitats: 'habitat',
    threats: 'threats',
    population: 'population',
    population_trend: 'populationTrend',
    range: 'range',
    use_trade: 'useTrade',
    measures: 'conservationActions'
  };
  
  //4.6.1-Validar que description existe
  species.description = {};
  
  //4.7-Reemplazo en la base de datos los campos no nulos que haya devuelto la API
  for (const [docKey, modelKey] of Object.entries(mapping)) {
    const raw = doc[docKey];
    if (typeof raw === 'string' && raw.trim() !== '') {
      const cleaned = cleanText(raw);
      if (cleaned !== species.description[modelKey]) {
        species.description[modelKey] = cleaned;
        changed = true;
      }
    }
  }
  
  console.log("   [species.controller - validateSpeciesDescription] Updated species with new documentation from IUCN.");
  await species.save();
  return { updated: true, fields: Object.values(mapping) };
}


//Funcion encargada de limpiar el texto de caracteres no deseados. Principalmente usada antes de guardar description, ya que los resultados desde la API vienen con tags HTML y otros elementos no deseados.
function cleanText(input = '') {
  let cleaned = sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} });
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}