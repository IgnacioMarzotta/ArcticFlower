const Cluster = require('../models/Cluster');
const Species = require('../models/Species');

/**
 * Selecciona una especie aleatoria con la categoría especificada (CR, EW o EX)
 * y que tenga al menos una ubicación registrada.
 * @param {string} category - La categoría de la especie (ej. 'CR').
 * @returns {Object} resultado con detalles de la especie.
 */
exports.getRandomSpeciesByCategory = async (category) => {
  const query = {
    category: category,
    locations: { $exists: true, $not: { $size: 0 } }
  };

  const count = await Species.countDocuments(query);
  if (count === 0) {
    throw new Error(`No hay especies con categoría ${category} que tengan ubicaciones registradas.`);
  }

  const rand = Math.floor(Math.random() * count);
  const species = await Species.findOne(query).skip(rand).lean();

  if (!species) {
    throw new Error(`Error inesperado: No se pudo encontrar una especie con categoría ${category} y ubicaciones después del conteo.`);
  }

  return species;
};

/**
 * Con una especie definida, obtiene uno de los clusters en los que la especie tiene una location y lo devuelve.
 * @param {Object} species - La especie de la cual obtener un cluster.
 * @returns {Object} resultado con detalles del cluster (country code y clusterId).
 */
exports.getRandomClusterFromSpecies = async (species) => {
  if (!species.locations || species.locations.length === 0) {
    throw new Error(`La especie ${species.scientific_name} no tiene ubicaciones. Esto no debería suceder si se filtró correctamente.`);
  }

  const loc = species.locations[
    Math.floor(Math.random() * species.locations.length)
  ];

  const cluster = await Cluster.findOne({ country: loc.country }).lean();
  if (!cluster) {
    throw new Error(`No existe Cluster para el código de país=${loc.country} asociado a la especie ${species.scientific_name}.`);
  }
  
  return { country: cluster.country, clusterId: cluster._id.toString() };
};