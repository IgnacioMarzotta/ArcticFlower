const axios = require('axios');

const IUCN_API_BASE_URL = 'https://api.iucnredlist.org/api/v4';
const IUCN_API_TOKEN = process.env.IUCN_API_TOKEN;


/**
 * Funcion que consulta el endpoint /taxa/scientific_name de IUCN. Dado que el dataset original esta creado con data de GBIF, para obtener assessments de cada especie desde IUCN, debe generarse el nombre cientifico de la especie en el formato correcto. Para esto se separa el "specificEpithet" del scientific_name usando el genus, y envio ambos al endpoint para obtener una descripcion detallada de la especie en IUCN.
 * @returns {Object} resultado con detalles de la especie.
 */
exports.getIucnSpeciesDescriptionByScientificName = async (genus, speciesPart) => {
    const url =
    `${IUCN_API_BASE_URL}/taxa/scientific_name`
    + `?genus_name=${encodeURIComponent(genus)}`
    + `&species_name=${encodeURIComponent(speciesPart)}`;
    const resp = await axios.get(url, {
        headers: { Authorization: `${IUCN_API_TOKEN}` }
    });
    return resp.data;
};


/**
 * Funcion que consulta el endpoint /assessment/ de IUCN. Esta funcion devuelve el assessment objetivo asociado a una especie con un assessment_id, de este assessment se rescata principalmente la description, references, credits, threats, y otros datos de relevancia.
 * @returns {Object} resultado con detalles del assessment.
 */
exports.getIucnSpeciesAssessmentById = async (assessment_id) => {
    if (!assessment_id) throw new Error('assessment_id required');
    const url =
    `${IUCN_API_BASE_URL}/assessment/${assessment_id}`;
    const resp = await axios.get(url, {
        headers: { Authorization: `${IUCN_API_TOKEN}` }
    });
    return resp.data;
};