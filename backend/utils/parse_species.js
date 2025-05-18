const csv = require('csv-parser');
const fs = require('fs');
const axios = require('axios');
const { Transform } = require('stream');

const API_URL = 'http://localhost:3000/api/species';
const BATCH_SIZE = 1; // Procesamiento estrictamente secuencial

//Utilidad deprecada, utilizada originalmente para obtener una a una las especies para generar la base de datos de produccion utilizando los distintos datasets.
const processSpecies = async (speciesData) => {
  try {
    const response = await axios.post(API_URL, speciesData);
    console.log(`✅ Species created: ${response.data.scientific_name}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating species: ${error.response?.data.error || error.message}`);
    return false;
  }
};

fs.createReadStream('backend/data/gbif_species.csv')
.pipe(csv({ separator: '\t' }))
.pipe(new Transform({
  objectMode: true,
  transform: async (row, _, callback) => {
    try {
      const speciesData = {
        taxon_id: row.taxonKey,
        scientific_name: row.species,
        category: (row.iucnRedListCategory || 'UNKNOWN').toUpperCase(),
        kingdom: row.kingdom,
        phylum: row.phylum,
        class: row.class,
        order: row.order,
        family: row.family,
        genus: row.genus
      };
      
      await processSpecies(speciesData);
      callback();
    } catch (error) {
      callback(error);
    }
  }
}))
.on('finish', () => console.log('⚠️ All species processed'))
.on('error', error => console.error('🔥 Critical error:', error));