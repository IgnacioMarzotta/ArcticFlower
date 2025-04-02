const Cluster = require('../models/Cluster');
const { getCountryCoordinates } = require('../services/geo.service');
const countries = require("i18n-iso-countries");
countries.registerLocale(require("i18n-iso-countries/langs/en.json"));

//Ranking de categorias IUCN, determina la peor categoria de las especies del cluster y el color del cluster en el front-end.
const categoryRanking = {
  'CR': 1,
  'EW': 2,
  'EX': 3
};

// Funcion para actualizar el cluster de una especie
exports.updateClusterForSpecies = async (input, res = null) => {
  try {
    const species = input.body ? input.body : input;
    
    if (!species || !species.locations || !Array.isArray(species.locations)) {
      throw new Error("La especie no posee ubicaciones válidas.");
    }
    
    for (const loc of species.locations) {
      const countryCode = loc.country.toUpperCase();
      let cluster = await Cluster.findOne({ country: countryCode });
      
      console.log(`Actualizando cluster para ${countryCode}, ${countries.getName(countryCode, "en")}`);
      
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
          worstCategory: species.category.toUpperCase()
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