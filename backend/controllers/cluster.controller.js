const Species = require('../models/Species');
const Cluster = require('../models/Cluster');
const { getCountryCoordinates } = require('../services/geo.service');
const { getOccurrencesByCountryBatch } = require('../services/populate.service');
const { getGbifCountryData } = require('../services/gbif.service');
const speciesController = require('./species.controller');

const countries = require("i18n-iso-countries");
const worldCountries = require('world-countries');
const { getContinentName } = require('@brixtol/country-continent');
countries.registerLocale(require("i18n-iso-countries/langs/en.json"));

//Ranking de categorias IUCN, determina la peor categoria de las especies del cluster y el color del cluster en el front-end.
const categoryRanking = {
  'CR': 1,
  'EW': 2,
  'EX': 3
};


/**
* Funcion deprecada utilizada en la generacin inicial de los clusters y especies. Calcula cuantos occurrences estan asociados a una especie desde la base de datos occurrences.db obtenida de GBIF.
*/
exports.updateAllClusterOccurrences = async (req, res) => {
  try {
    // 1. Traer todos los clusters y sus country codes
    const clusters = await Cluster.find().select('country');
    const countryCodes = clusters.map(c => c.country);
    
    // 2. Obtener todos los conteos de ocurrencias
    const counts = await getOccurrencesByCountryBatch(countryCodes);
    
    // 3. Actualizar en MongoDB
    const updates = clusters.map(c => 
      Cluster.updateOne(
        { country: c.country },
        { $set: { occurrences: counts[c.country] || 0 } }
      )
    );
    await Promise.all(updates);
    
    res.json({ message: 'Clusters actualizados con occurrences', counts });
  } catch (err) {
    console.error('Error actualizando occurrences:', err);
    res.status(500).json({ error: 'No se pudo actualizar occurrences' });
  }
};


/**
* Funcion para calcular el tamaño del marcador segun el area del pais usando escala logaritmica (mas pequeño para paises isleños, por ejemplo, mas grande para paises grandes, China o Rusia, por ejemplo)
*/
exports.computeMarkerSize = async (countryCode) => {
  const countryData = worldCountries.find(c => c.cca2 === countryCode);
  if (!countryData || !countryData.area) {
    return 50;
  }
  const minSize = 10;
  const maxSize = 150;
  let size = Math.log10(countryData.area) * 10;
  size = Math.max(minSize, Math.min(maxSize, size));
  return size;
};


/**
* Funcion utilizada para actualizar el cluster. Principalmente utilizada al crear una nueva especie en el proceso de generacion inicial de la base de datos. Se encarga de validar si el cluster existe para el territorio/pais, y agrega todas las propiedades necesarias para el cluster, como la cantidad de especies y la peor categoria de las especies en ese cluster. Si el cluster no existe, lo crea y lo guarda en la base de datos.
*/
exports.updateClusterForSpecies = async (input, res = null) => {
  try {
    const species = input.body ? input.body : input;
    
    if (!species || !species.locations || !Array.isArray(species.locations) || species.locations.length === 0) {
      throw new Error("La especie no posee ubicaciones válidas.");
    }
    
    for (const loc of species.locations) {
      const countryCode = loc.country.toUpperCase();
      let cluster = await Cluster.findOne({ country: countryCode });
      
      console.log(`Actualizando cluster para ${countryCode}, ${countries.getName(countryCode, "en")}`);
      
      const markerSize = await exports.computeMarkerSize(countryCode);
      
      if (!cluster) {
        const center = getCountryCoordinates(countryCode);
        const centerLat = center ? center.lat : loc.lat;
        const centerLng = center ? center.lng : loc.lng;
        
        cluster = new Cluster({
          country: countryCode,
          countryName: countries.getName(countryCode, "en") || countryCode,
          count: 1,
          lat: centerLat,
          lng: centerLng,
          worstCategory: species.category.toUpperCase(),
          markerSize
        });
      } else {
        cluster.count += 1;
        
        const currentRank = categoryRanking[cluster.worstCategory] ?? 0;
        const speciesRank = categoryRanking[species.category.toUpperCase()] ?? 0;
        if (speciesRank > currentRank) {
          cluster.worstCategory = species.category.toUpperCase();
        }
      }
      
      await cluster.save();
    }
    
    if (res) {
      res.status(200).json({ message: "Cluster(s) actualizado(s) correctamente" });
    }
  } catch (error) {
    console.error("Error al actualizar clusters:", error);
    
    if (res) {
      res.status(500).json({ error: "Error al actualizar clusters", details: error.message });
    } else {
      throw error;
    }
  }
};


exports.getSpeciesClusters = async (req, res) => {
  try {
    const clusters = await Cluster.find().sort({ country: 1 });
    res.json(clusters);
  } catch (error) {
    console.error("Error al obtener clusters:", error);
    res.status(500).json({ error: "Error al obtener clusters" });
  }
};


/**
* 0. Funcion central encargada de actualizar el cluster desde la API. Si el usuario hizo click en un cluster y ese cluster no ha sido actualizado en cierto tiempo, se llama a esta funcion para actualizarlo.
* @returns {Object} resultado con los nuevos datos a actualizar en la base de datos.
*/
exports.updateClusterStatusFromAPI = async (req, res) => {
  try {
    //console.log(`[cluster.controller - updateClusterStatusFromAPI] Payload recibido:`, req.body);
    const { country: countryCode, updatedAt, id } = req.body;
    
    //0. Validacion basica de que llegue el countryCode y el id del cluster a actualizar.
    if (!countryCode) {
      console.error(`[cluster.controller - updateClusterStatusFromAPI] Missing countryCode`);
      return res.status(400).json({ error: 'Falta el countryCode' });
    }
    
    //1. Calcular rango de fechas, utilizando la fecha de hoy y la fecha de la ultima actualizacion del cluster. Se utiliza el formato YYYY-MM-DD para la consulta a GBIF.
    const [dateRangeMin, dateRangeMax] = computeDateRange(updatedAt);
    
    //2. Consulta inicial al endpoint de GBIF para obtener el total de ocurrences desde la ultima actualizacion del cluster, y asi poder calcular la paginacion para las siguientes consultas.
    const initial = await getGbifCountryData(countryCode, dateRangeMin, dateRangeMax, 0, 0);
    const totalCount = initial.count;
    console.log(`[cluster.controller - updateClusterStatusFromAPI] totalCount: ${totalCount}`);
    
    //3.Hago las consultas paginadas para obtener todos los ocurrences, y concatenar en un solo array.
    const gbifResults = await getPaginatedGbifResults(countryCode, dateRangeMin, dateRangeMax, totalCount);
    
    // 4. Para cada occurrence, realizar las validaciones correspondientes.
    for (const occurrence of gbifResults) {
      console.log(`   [cluster.controller - updateClusterStatusFromAPI] Processing occurrence`);
      const { taxonKey, decimalLatitude, decimalLongitude, countryCode: cc, gbifID: occurrenceId } = occurrence;
      
      //4.1 Valido si la especie existe en la base de datos con el taxonKey del result
      const species = await Species.findOne({ taxon_id: taxonKey });
      if (!species) {
        
        //4.1.1 Si no existe, creo y guardo en la base de datos.
        const {kingdom, phylum, class: className, order, family, genus} = occurrence;
        console.error(`   [cluster.controller - updateClusterStatusFromAPI] Species not found for taxonKey: ${taxonKey}, creating...`);
        //4.1.2 Generar la estructura de la nueva especie
        const newSpecies = {
          body: {
            taxon_id: taxonKey,
            scientific_name: occurrence.scientificName.split(' ').slice(0, 2).join(' '),
            category: occurrence.iucnRedListCategory || 'CR',
            kingdom,
            phylum,
            class: className,
            order,
            family,
            genus,
            locations: [{
              country:    countryCode,
              continent:  getContinentName(countryCode),
              lat:         decimalLatitude,
              lng:         decimalLongitude
            }]
          }
        };
        
        //4.1.3 Delegar la creacion de la especie con la estructura generada a la funcion createSpecies del controller de especies.
        speciesController.createSpecies(
          newSpecies,
          { status() { return this; }, json() { return this; } }
        )
        .catch(err => console.error("[async createSpecies]", err));
        
        continue;
      }
      
      // 4.2 Validar si ya tiene location en el pais
      const exists = species.locations.some(loc => loc.country === countryCode);
      if (exists) {
        //4.2.1 Si existe, ignoro.
        console.log(`   [cluster.controller - updateClusterStatusFromAPI] Species ${taxonKey} already has location in this cluster. Skipping...`);
      } else {
        //4.2.2 Si no existe, agregar location
        console.log(`   [cluster.controller - updateClusterStatusFromAPI] Species ${taxonKey} does not have a location in this cluster, creating.`);
        species.locations.push({
          country: countryCode,
          continent: getContinentName(countryCode),
          lat: decimalLatitude,
          lng: decimalLongitude
        });
        console.log(`   [cluster.controller - updateClusterStatusFromAPI] Location successfully created.`);
      }
      
      // 4.3 Validar si ya tiene el occurrenceId en gbifIds. Si no tiene, agregar
      if (!species.gbifIds.includes(String(occurrenceId))) {
        species.gbifIds.push(String(occurrenceId));
        console.log(`   [cluster.controller - updateClusterStatusFromAPI] gbifId ${occurrenceId} added to species ${taxonKey}.`);
      } else {
        console.log(`   [cluster.controller - updateClusterStatusFromAPI] gbifId ${occurrenceId} already present in species ${taxonKey}.`);
      }
      
      await species.save();
    }
    
    //5. Habiendo creado las especies/locations, actualizo la cantidad de especies en el cluster y la categoria de la peor especie.
    const infoResult = await updateSpeciesCountAndWorstCategory(id);
    console.log(`[cluster.controller - updateClusterStatusFromAPI] Cluster updated successfully.`);
    
    //6. Devolver al front
    res.json({
      message: 'Cluster actualizado',
      cluster: infoResult
    });
    
  } catch (error) {
    console.error("[cluster.controller - updateClusterStatusFromAPI] Error updating cluster: ", error);
    res.status(500).json({ error: "Error interno al actualizar el cluster" });
  }
};


/**
* 1. Funcion encargada de calcular el rango de fechas para la consulta a GBIF. Se utiliza la fecha de la ultima actualizacion del cluster y la fecha actual.
* @param {String} dateRangeMin - Ultima fecha de actualizacion del pais (YYYY-MM-DD).
* @param {String} dateRangeMax - Fecha actual (YYYY-MM-DD).
* @returns {Object} Array con el rango de fechas minimo y maximo.
*/
function computeDateRange(updatedAt) {
  const min = new Date(updatedAt).toISOString().split('T')[0];
  const max = new Date().toISOString().split('T')[0];
  return [min, max];
}


/**
* 3. Funcion encargada de realizar las consultas paginadas a GBIF para obtener todos los ocurrences, y concatenar en un solo array.
* @param {String} countryCode - Codigo del pais a consultar en GBIF.
* @param {String} dateRangeMin - Ultima fecha de actualizacion del pais (YYYY-MM-DD).
* @param {String} dateRangeMax - Fecha actual (YYYY-MM-DD).
* @param {Number} totalCount - Cantidad total de ocurrences obtenidos desde GBIF para el pais consultado, utilizado para calcular la cantidad de paginas a consultar.
* @returns {Object} Array con todos los occurrences obtenidos desde GBIF para el pais consultado, desde la ultima fecha de actualizacion del cluster hasta la fecha de hoy.
*/
async function getPaginatedGbifResults(countryCode, dateRangeMin, dateRangeMax, totalCount) {
  
  //3.1 Teniendo el total, calculo la cantidad total de consultas paginadas a realizar (limite de 300 registros por pagina, establecido por GBIF)    
  const PAGE_SIZE = 300;
  const pages = Math.ceil(totalCount / PAGE_SIZE);
  let allResults = [];
  console.log(`[cluster.controller - updateClusterStatusFromAPI] Pages calculated: ${pages}`);
  
  //3.2 Realizo las consultas paginadas a GBIF para obtener todos los ocurrences, y concatenar en un solo array.
  for (let page = 0; page < pages; page++) {
    const offset   = page * PAGE_SIZE;
    console.log(`   [cluster.controller - updateClusterStatusFromAPI] Querying page ${page + 1} of ${pages}.`);
    const pageData = await getGbifCountryData(countryCode, dateRangeMin, dateRangeMax, PAGE_SIZE, offset);
    allResults = allResults.concat(pageData.results);
  }
  
  return allResults;
}


/**
* Funcion encargada de actualizar el cluster segun datos de las especies. Calcula cuantas especies tienen un location en ese cluster, y obtiene la categoria de la peor especie en dicho pais (CR, EW, EX).
* @returns {Object} Cluster actualizado con la cantidad de especies y la peor categoria.
*/
async function updateSpeciesCountAndWorstCategory(clusterId) {
  try {
    if (!clusterId) {
      console.error(`   [cluster.controller - updateSpeciesCountAndWorstCategory] Missing clusterId.`);
      return { updated: false, reason: 'Falta clusterId' };
    }
    
    // Buscar el cluster
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      console.error(`   [cluster.controller - updateSpeciesCountAndWorstCategory] Cluster not found.`);
      return { updated: false, reason: 'Cluster no encontrado' };
    }
    
    const { country } = cluster;
    if (!country) {
      console.error(`   [cluster.controller - updateSpeciesCountAndWorstCategory] Cluster is missing country.`);
      return { updated: false, reason: 'Cluster sin country' };
    }
    
    // Buscar todas las species que tienen location en este país
    const speciesList = await Species.find({ 'locations.country': country }, 'category');
    
    if (!speciesList.length) {
      console.warn(`   [cluster.controller - updateSpeciesCountAndWorstCategory] No species found for cluster ${clusterId} (${country})`);
      return { updated: false, reason: 'No hay especies en este país' };
    }
    
    // Contar la cantidad de especies
    const totalSpecies = speciesList.length;
    
    // Determinar la peor categoría
    const priority = { CR: 1, EW: 2, EX: 3 };
    let worstCategory = 'CR'; // default
    speciesList.forEach(species => {
      const cat = species.category?.toUpperCase();
      if (cat && priority[cat] && priority[cat] > priority[worstCategory]) {
        worstCategory = cat;
      }
    });
    
    // Actualizar el cluster
    cluster.count = totalSpecies;
    cluster.category = worstCategory;
    cluster.updatedAt = new Date();
    await cluster.save();
    
    console.log(`   [cluster.controller - updateSpeciesCountAndWorstCategory] Cluster updated successfully: ${clusterId}, ${country}, count: ${totalSpecies}, worstCategory: ${worstCategory}`);
    
    return { updated: true, count: totalSpecies, category: worstCategory };
    
  } catch (error) {
    console.error(`   [cluster.controller - updateSpeciesCountAndWorstCategory] Error updating cluster:`, error);
    return { updated: false, reason: error.message };
  }
}