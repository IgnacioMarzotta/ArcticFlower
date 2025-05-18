const fs = require('fs');
const csv = require('csv-parser');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const INPUT_CSV = 'data/iucn_assessments.csv';
const OUTPUT_CSV = 'data/iucn_assessments_clean.csv';
const ENCODING = 'utf8';

function cleanField(text) {
  if (!text) return null;
  
  let cleaned = text
  .replace(/<\/?[^>]+>/gi, ' ')
  .replace(/(\r\n|\n|\r)/gm, ' ')
  .replace(/ +/g, ' ')
  .replace(/&(nbsp|#160);/g, ' ')
  .replace(/“|”/g, '"')
  .replace(/‘|’/g, "'")
  .trim();
  return cleaned || null;
}

//Utilidad deprecada, utilizada originalmente para la limpieza de uno de los datasets utilizados en la creacion de la base de datos de produccion, especificamente la tabla assessments, de la que se rescatan elementos como redListCategory, rationale, habitat, threats, population, descripcion general, entre otros.
function cleanIUCNRow(row) {
  return {
    assessmentId: parseInt(row.assessmentId) || null,
    internalTaxonId: parseInt(row.internalTaxonId) || null,
    scientificName: cleanField(row.scientificName),
    redlistCategory: cleanField(row.redlistCategory),
    redlistCriteria: cleanField(row.redlistCriteria),
    yearPublished: parseInt(row.yearPublished) || null,
    assessmentDate: cleanField(row.assessmentDate)?.split(' ')[0] || null,
    criteriaVersion: cleanField(row.criteriaVersion),
    language: cleanField(row.language),
    rationale: cleanField(row.rationale),
    habitat: cleanField(row.habitat),
    threats: cleanField(row.threats),
    population: cleanField(row.population),
    populationTrend: cleanField(row.populationTrend),
    range: cleanField(row.range),
    useTrade: cleanField(row.useTrade),
    systems: row.systems?.split('|').map(s => cleanField(s)) || [],
    conservationActions: cleanField(row.conservationActions),
    realm: cleanField(row.realm),
    yearLastSeen: parseInt(row.yearLastSeen) || null,
    possiblyExtinct: row.possiblyExtinct?.toLowerCase() === 'true',
    possiblyExtinctInTheWild: row.possiblyExtinctInTheWild?.toLowerCase() === 'true',
    scopes: cleanField(row.scopes)
  };
}

async function cleanCSV() {
  try {
    const rawData = fs.readFileSync(INPUT_CSV, ENCODING);
    const records = parse(rawData, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true
    });
    
    const cleanedData = records.map(cleanIUCNRow);
    
    const stringData = cleanedData.map(row => ({
      ...row,
      systems: row.systems.join('|')
    }));
    
    const output = stringify(stringData, {
      header: true,
      columns: Object.keys(cleanedData[0])
    });
    
    fs.writeFileSync(OUTPUT_CSV, output, ENCODING);
    
    console.log(`✅ CSV limpiado guardado en: ${OUTPUT_CSV}`);
    console.log(`⚠️ Total de registros procesados: ${cleanedData.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  cleanCSV();
}

module.exports = { cleanIUCNRow };