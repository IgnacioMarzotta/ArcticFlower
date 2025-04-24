const Cluster = require('../models/Cluster');
const { getCountryCoordinates } = require('../services/geo.service');
const { getOccurrencesByCountryBatch } = require('../services/populate.service');
const { getGbifCountryData } = require('../services/gbif.service');
const countries = require("i18n-iso-countries");
const worldCountries = require('world-countries');
countries.registerLocale(require("i18n-iso-countries/langs/en.json"));


//Ranking de categorias IUCN, determina la peor categoria de las especies del cluster y el color del cluster en el front-end.
const categoryRanking = {
  'CR': 1,
  'EW': 2,
  'EX': 3
};


// Funcion para calcular el tamaño del marcador segun el area del pais usando escala logaritmica (mas pequeño para paises isleños, por ejemplo, mas grande para paises grandes, China o Rusia, por ejemplo)
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


exports.updateClusterStatusFromAPI = async (req, res) => {
  try {
    //1. Saco el countryCode desde la ruta
    const countryCode = req.params.countryCode;

    //2. Con el countryCode, consulto a la API de GBIF para obtener el total de occurrences de ese pais.
    const data = await getGbifCountryData(countryCode);
    const count = data.occurrences.count;

    //3. Actualizo el cluster en la DB con el nuevo conteo de occurrences.
    const updated = await Cluster.findOneAndUpdate(
      { country: countryCode },
      {
        $set: { occurrences: count },
        $currentDate: { updatedAt: true }
      },
      { new: true, select: '-__v' }
    );

    //4. Devuelvo ambas al front
    res.json({
      cluster: updated,
      gbif:    data.occurrences
    });
  } catch (error) {
    console.error("Error en updateClusterStatusFromAPI:", error);
    res.status(500).json({ error: "Error interno en GBIF" });
  }
};


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


exports.getSpeciesClusters = async (req, res) => {
  try {
    const clusters = await Cluster.find().sort({ country: 1 });
    res.json(clusters);
  } catch (error) {
    console.error("Error al obtener clusters:", error);
    res.status(500).json({ error: "Error al obtener clusters" });
  }
};