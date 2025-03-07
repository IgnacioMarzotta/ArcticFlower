const Cluster = require('../models/Cluster');
const GeoService = require('../services/geo.service');

// Definición de un ranking para las categorías. A mayor valor, peor estado.
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

    // Buscar el cluster existente para el país
    let cluster = await Cluster.findOne({ country: countryCode });
    
    if (!cluster) {
      console.log(`Creando cluster para ${countryCode}`);
      const center = GeoService.getCountryCoordinates(countryCode);
      const centerLat = center ? center.lat : loc.lat;
      const centerLng = center ? center.lng : loc.lng;
      
      // Creamos el cluster inicial con count 1 y la categoría de la especie actual.
      cluster = new Cluster({
        country: countryCode,
        countryName: countryCode, // Aquí puedes mapear a un nombre real si lo deseas.
        count: 1,
        lat: centerLat,
        lng: centerLng,
        worstCategory: species.category.toUpperCase()
      });
    } else {
      // Actualizamos el contador
      cluster.count += 1;
      
      // Actualizamos worstCategory si la categoría de la especie actual es peor
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
    const species = req.body; // Se espera que incluya locations y category
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

// Exportamos todas las funciones en un objeto
module.exports = {
  updateClusterForSpecies,
  updateClusterForSpeciesEndpoint,
  getSpeciesClusters
};