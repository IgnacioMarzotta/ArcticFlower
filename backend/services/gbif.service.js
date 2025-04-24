const axios = require('axios');

const GBIF_API_BASE_URL = 'https://api.gbif.org/v1';


/**
 * Funcion que consulta al endpoint /occurrence/search de GBIF, especificamente haciendo una busqueda especifica para ArcticFlower, donde consulto un pais especifico con su codigo ISO 3166-1 alpha-2, y solicitando unicamente occurrences que afecten a especie en estado de CR,EW y EX. Este endpoint devuelve occurrences asociados a un pais, y estos occurrences deben ser analizados para extraer nuevas especies o cambios en las especies existentes, como nuevo location en otro pais o cambios de estado.
 * @returns {Object} Array de hasta 100 occurrences de especies en estado de CR,EW y EX para el pais establecido, adicionalmente trae la cantidad de occurrences asociados a ese pais, utilizado para calcular la diferencia y consultar de forma especifica los cambios a ese pais.
 */
exports.getGbifCountryData = async (countryCode) => {
  const url = `${GBIF_API_BASE_URL}/occurrence/search?country=${countryCode}&limit=100&hasCoordinate=true&iucnRedListCategory=EX&iucnRedListCategory=EW&iucnRedListCategory=CR`;
  const response = await axios.get(url);
  return { occurrences: response.data };
};


/**
 * Funcion que consulta el endpoint /species/${taxonKey}/vernacularNames de GBIF, utilizada para conseguir los common_names de especies que aun no tienen.
 * @returns {Object} resultado con los vernacularNames asociados a la especie consultada con el taxonKey de GBIF.
 */
exports.getGbifSpeciesVernacularName = async (taxonKey) => {
  const url = `${GBIF_API_BASE_URL}/species/${taxonKey}/vernacularNames`;
  const response = await axios.get(url);
  return response.data;
};


/**
 * Funcion que consulta el endpoint /species/${taxonKey}/iucnRedListCategory de GBIF, utilizada para actualizar el estado de la especie cuando no ha sido actualizada despues de cierta cantidad de tiempo.
 * @returns {Object} resultado con el estado mas reciente de la especie segun la categoria de IUCN Red List.
 */
exports.getGbifSpeciesRedListCategory = async (taxonKey) => {
  const url = `${GBIF_API_BASE_URL}/species/${taxonKey}/iucnRedListCategory`;
  const response = await axios.get(url);
  return response.data;  
};


/**
 * Funcion que consulta el endpoint /species/${taxonKey}/media de GBIF, utilizada para conseguir los medios (imagenes, videos, documentos, etc) de especies que aun no tienen.
 * @returns {Object} resultado con un conjunto de medios de la especie, con atributos como idenitifier, titulo, descripcion y referencias.
 */
exports.getGbifSpeciesMedia = async (taxonKey) => {
  const url = `${GBIF_API_BASE_URL}/species/${taxonKey}/media`;
  const response = await axios.get(url);
  return response.data;  
};