import { createReadStream } from 'fs';
import readline from 'readline';
import { createObjectCsvWriter } from 'csv-writer';

const inputFile = 'data/gbif_verbatim.txt';
const outputFile = 'data/gbif_verbatim_clean.csv';

const csvWriter = createObjectCsvWriter({
  path: outputFile,
  header: [
    { id: 'gbifID', title: 'gbifID' },
    { id: 'decimalLatitude', title: 'decimalLatitude' },
    { id: 'decimalLongitude', title: 'decimalLongitude' },
    { id: 'geodeticDatum', title: 'geodeticDatum' },
    { id: 'coordinateUncertaintyInMeters', title: 'coordinateUncertaintyInMeters' },
    { id: 'country', title: 'country' },
    { id: 'locality', title: 'locality' },
    { id: 'eventDate', title: 'eventDate' },
    { id: 'scientificName', title: 'scientificName' },
    { id: 'kingdom', title: 'kingdom' },
    { id: 'phylum', title: 'phylum' },
    { id: 'class', title: 'class' },
    { id: 'order', title: 'order' },
    { id: 'family', title: 'family' },
    { id: 'genus', title: 'genus' },
    { id: 'specificEpithet', title: 'specificEpithet' },
    { id: 'taxonRank', title: 'taxonRank' },
    { id: 'basisOfRecord', title: 'basisOfRecord' },
    { id: 'occurrenceStatus', title: 'occurrenceStatus' },
    { id: 'recordedBy', title: 'recordedBy' },
    { id: 'vernacularName', title: 'vernacularName' }
  ]
});

//Utilidad deprecada, utilizada originalmente para la limpieza de uno de los datasets utilizados en la creacion de la base de datos de produccion, especificamente la tabla verbatim, de la que se rescatan elementos como kingdom, phylum, class, order, vernacularName, entre otros.
async function processFile() {
  let count = 0;
  const records = [];
  
  const rl = readline.createInterface({
    input: createReadStream(inputFile, 'utf8'),
    crlfDelay: Infinity
  });
  
  const headers = (await rl[Symbol.asyncIterator]().next()).value.split('\t');
  
  for await (const line of rl) {
    const row = line.split('\t').reduce((acc, val, i) => {
      acc[headers[i]] = val;
      return acc;
    }, {});
    
    const lat = parseFloat(row.decimalLatitude);
    const lon = parseFloat(row.decimalLongitude);
    
    if (
      isNaN(lat) || 
      isNaN(lon) || 
      Math.abs(lat) > 90 || 
      Math.abs(lon) > 180
    ) continue;
    
    // Construir registro
    const record = {
      gbifID: row.gbifID,
      decimalLatitude: lat,
      decimalLongitude: lon,
      geodeticDatum: row.geodeticDatum || 'unknown',
      coordinateUncertaintyInMeters: parseFloat(row.coordinateUncertaintyInMeters) || -1,
      country: (row.country || '').slice(0, 255),
      locality: (row.locality || '').slice(0, 255),
      eventDate: row.eventDate,
      scientificName: (row.scientificName || '').slice(0, 255),
      kingdom: row.kingdom,
      phylum: row.phylum,
      class: row.class,
      order: row.order,
      family: row.family,
      genus: row.genus,
      specificEpithet: row.specificEpithet,
      taxonRank: row.taxonRank,
      basisOfRecord: row.basisOfRecord,
      occurrenceStatus: row.occurrenceStatus,
      recordedBy: (row.recordedBy || '').slice(0, 255),
      vernacularName: row.vernacularName,
    };
    
    records.push(record);
    count++;
    
    // Escribir en bloques para evitar sobrecarga de memoria
    if (records.length >= 5000) {
      await csvWriter.writeRecords(records);
      records.length = 0;
    }
  }
  
  // Escribir registros restantes
  if (records.length > 0) {
    await csvWriter.writeRecords(records);
  }
  
  return count;
}

// Ejecutar con manejo de memoria
async function main() {
  try {
    console.log('⚠️ Procesando archivo...');
    const total = await processFile();
    console.log(`✅ Proceso completado. Registros procesados: ${total}`);
    console.log(`📄 Archivo generado: ${outputFile}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();