const Cluster = require('../models/Cluster');
const Species = require('../models/Species');


/**
 * Selecciona una especie aleatoria con al categoria especificada (CR, EW o EX)
 * @returns {Object} resultado con detalles de la especie.
 */
exports.getRandomSpeciesByCategory = async (category) => {
  const count = await Species.countDocuments({ category });
  if (count === 0) {
    throw new Error(`No hay especies con categoría ${category}`);
  }
  const rand = Math.floor(Math.random() * count);
  const species = await Species.findOne({ category }).skip(rand).lean();
  return species;
};


/**
 * Con una especie definida, obtiene uno de los cluster en los que la especie tiene un location y lo devuelve.
 * @returns {Object} resultado con detalles del cluster.
 */
exports.getRandomClusterFromSpecies = async (species) => {
  if (!species.locations || !species.locations.length) {
    throw new Error(`La especie ${species.scientific_name} no tiene ubicaciones`);
  }

  const loc = species.locations[
    Math.floor(Math.random() * species.locations.length)
  ];

  const cluster = await Cluster.findOne({ country: loc.country }).lean();
  if (!cluster) {
    throw new Error(`No existe Cluster para country=${loc.country}`);
  }
  
  return { country: cluster.country, clusterId: cluster._id };
};