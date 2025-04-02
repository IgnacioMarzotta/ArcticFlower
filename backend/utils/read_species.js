const fs = require('fs');
const csv = require('csv-parser');

const INPUT_CSV = 'data/iucn_assessments_clean.csv';
const SAMPLE_SIZE = 5;

function readCSVSample() {
  const results = [];
  
  fs.createReadStream(INPUT_CSV)
  .pipe(csv())
  .on('data', (row) => {
    if (results.length < SAMPLE_SIZE) {
      const processedRow = {
        ...row,
        assessmentId: parseInt(row.assessmentId),
        internalTaxonId: parseInt(row.internalTaxonId),
        yearPublished: parseInt(row.yearPublished),
        yearLastSeen: row.yearLastSeen ? parseInt(row.yearLastSeen) : null,
        possiblyExtinct: row.possiblyExtinct === 'true',
        possiblyExtinctInTheWild: row.possiblyExtinctInTheWild === 'true',
        systems: row.systems.split('|')
      };
      
      results.push(processedRow);
    }
  })
  .on('end', () => {
    if (results.length === 0) {
      console.log('No se encontraron registros en el archivo CSV');
      return;
    }
    
    const output = {
      total_registros: results.length,
      muestra: results
    };
    
    console.log(JSON.stringify(output, null, 2));
  })
  .on('error', (error) => {
    console.error('Error leyendo el archivo:', error.message);
  });
}

if (require.main === module) {
  if (!fs.existsSync(INPUT_CSV)) {
    console.error(`Error: El archivo ${INPUT_CSV} no existe`);
    process.exit(1);
  }
  
  readCSVSample();
}

module.exports = readCSVSample;