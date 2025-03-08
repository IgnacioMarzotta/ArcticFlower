const Cluster = require('../models/Cluster');
const GeoService = require('../services/geo.service');

const countries = require("i18n-iso-countries");
countries.registerLocale(require("i18n-iso-countries/langs/en.json"));
//countries.registerLocale(require("i18n-iso-countries/langs/es.json"));

// Definicion de un ranking para las categorias. A mayor valor, peor estado.
const categoryRanking = {
  'LC': 0,
  'NT': 1,
  'VU': 2,
  'EN': 3,
  'CR': 4,
  'EX': 5,
  'DD': 6,
  'EW': 7,
};

async function updateClusterForSpecies(species) {
  if (!species.locations || !Array.isArray(species.locations)) {
    throw new Error("La especie no posee ubicaciones válidas.");
  }
  
  for (const loc of species.locations) {
    const countryCode = loc.country.toUpperCase();

    // Buscar el cluster existente para el pais
    let cluster = await Cluster.findOne({ country: countryCode });
    
    console.log(`Actualizando cluster para ${countryCode}, ${countries.getName(countryCode, "en")}`);
    if (!cluster) {
      const center = GeoService.getCountryCoordinates(countryCode);
      const centerLat = center ? center.lat : loc.lat;
      const centerLng = center ? center.lng : loc.lng;
      
      // Crear el cluster inicial con count 1 y la categoria de la especie actual.
      cluster = new Cluster({
        country: countryCode,
        countryName: countries.getName(countryCode, "en") || countryCode,
        count: 1,
        lat: centerLat,
        lng: centerLng,
        worstCategory: species.category.toUpperCase()
      });
    } else {
      // Actualizar el contador
      cluster.count += 1;
      
      // Actualizar worstCategory si la categoria de la especie actual es peor
      const currentRank = categoryRanking[cluster.worstCategory] ?? 0;
      const speciesRank = categoryRanking[species.category.toUpperCase()] ?? 0;
      if (speciesRank > currentRank) {
        cluster.worstCategory = species.category.toUpperCase();
      }
    }
    
    await cluster.save();
  }
}

async function updateClusterForSpeciesEndpoint(req, res) {
  try {
    const species = req.body;
    await updateClusterForSpecies(species);
    res.status(200).json({ message: "Cluster(s) actualizado(s) correctamente" });
  } catch (error) {
    console.error("Error al actualizar clusters:", error);
    res.status(500).json({ error: "Error al actualizar clusters", details: error.message });
  }
}

async function getSpeciesClusters(req, res) {
  try {
    const clusters = await Cluster.find().sort({ country: 1 });
    res.json(clusters);
  } catch (error) {
    console.error("Error al obtener clusters:", error);
    res.status(500).json({ error: "Error al obtener clusters" });
  }
}

module.exports = {
  updateClusterForSpecies,
  updateClusterForSpeciesEndpoint,
  getSpeciesClusters
};