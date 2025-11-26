// const sqlite3 = require('sqlite3').verbose();
// const path = require('path');
// const { getContinentName } = require('@brixtol/country-continent');
// const GeoService = require('./geo.service');
// const turf = require('@turf/turf');

// const OCCURRENCES_DB_PATH = path.resolve(__dirname, '../data/gbif_occurrences.db');
// const occurrences_db = new sqlite3.Database(OCCURRENCES_DB_PATH, sqlite3.OPEN_READONLY);

// const MEDIA_DB_PATH = path.resolve(__dirname, '../data/gbif_multimedia.db');
// const media_db = new sqlite3.Database(MEDIA_DB_PATH, sqlite3.OPEN_READONLY);

// const VERBATIM_DB_PATH = path.resolve(__dirname, '../data/gbif_verbatim.db');
// const verbatim_db = new sqlite3.Database(VERBATIM_DB_PATH, sqlite3.OPEN_READONLY);

// const IUCN_DB_PATH = path.resolve(__dirname, '../data/iucn_assessments.db');
// const iucn_db = new sqlite3.Database(IUCN_DB_PATH, sqlite3.OPEN_READONLY);

// const TYPE_MAP = {
//   jpg: 'StillImage',
//   jpeg: 'StillImage',
//   png: 'StillImage',
//   webp: 'StillImage',
//   mp4: 'MovingImage',
//   mpeg: 'Sound',
//   wav: 'Sound',
//   pdf: 'Document'
// };

// const FORMAT_MAP = {
//   jpg: 'image/jpeg',
//   jpeg: 'image/jpeg',
//   png: 'image/png',
//   webp: 'image/webp',
//   mp4: 'video/mp4',
//   mpeg: 'audio/mpeg',
//   wav: 'audio/wav',
//   pdf: 'application/pdf'
// };


// /**
//  * Devuelve un mapa de todos los ids de gbif asociados a esa especie para futuras consultas.
//  */
// exports.getGbifIdsForSpecies = async (taxonId) => {
//   const taxonKey = parseInt(taxonId, 10);
//   if (isNaN(taxonKey)) {
//     throw new Error("taxonId debe ser un número válido");
//   }
  
//   const query = `
//     SELECT gbifID 
//     FROM occurrences 
//     WHERE taxonKey = ? 
//     LIMIT 1000`;
  
//   const rows = await new Promise((resolve, reject) => {
//     occurrences_db.all(query, [taxonKey], (err, result) => {
//       err ? reject(err) : resolve(result);
//     });
//   });
//   return rows.map(r => r.gbifID.toString());
// };


// /**
//  * Obtiene las coordenadas unicas de la especie, con un maximo de 1 por pais.
//  */
// exports.getUniqueLocations = async (gbifIds) => {
//   return new Promise((resolve, reject) => {
//     if (!gbifIds.length) return resolve([]);
    
//     const query = `
//       SELECT countryCode, decimalLatitude AS lat, decimalLongitude AS lng
//       FROM occurrences
//       WHERE gbifID IN (${gbifIds.map(() => '?').join(',')})
//       ORDER BY gbifID
//     `;
    
//     occurrences_db.all(query, gbifIds, (err, rows) => {
//       if (err) return reject(err);
      
//       const seenCountries = new Set();
//       const locations = [];
      
//       rows.forEach(row => {
      
//         if (!row.countryCode || !row.countryCode.trim()) return;
//         const countryCode = row.countryCode.toUpperCase().substring(0, 2);
        
//         if (seenCountries.has(countryCode)) return;
        
//         const lat = parseFloat(row.lat);
//         const lng = parseFloat(row.lng);
//         if (!isValidCoordinate(lat, lng)) return;
        
//         let continent;
//         try {
//           continent = getContinentName(countryCode);
//         } catch (error) {
//           console.error(`Error obteniendo continente para el código ${countryCode}: ${error.message}`);
//           return;
//         }
        
//         const validContinents = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'];
//         if (!continent || !validContinents.includes(continent)) {
//           console.error(`Código ${countryCode} obtuvo continente inválido: ${continent}`);
//           return;
//         }
        
//         seenCountries.add(countryCode);
//         locations.push({
//           country: countryCode,
//           continent,
//           lat,
//           lng
//         });
//       });
      
//       resolve(locations);
//     });
//   });
// };

// //
// function isValidCoordinate(lat, lng) {
//   return typeof lat === 'number' && typeof lng === 'number' &&
//   !isNaN(lat) && !isNaN(lng) &&
//   lat >= -90 && lat <= 90 &&
//   lng >= -180 && lng <= 180;
// }

// function getContinent(countryCode) {
//   const country = countries.find(c => c.cca2 === countryCode);
//   return country?.region?.replace(/\s+/g, ' ').trim() || 'Unknown';
// }


// /**
//  * Obtiene todas las referencias y derechos de autor asociados a la especie y sus medios.
//  */
// exports.getUniqueReferences = async (gbifIds) => {
//   const CHUNK_SIZE = 999;
//   const references = new Set();
  
//   const query = `
//     SELECT DISTINCT 
//       NULLIF(TRIM(rightsHolder), '') AS rh,
//       NULLIF(TRIM(recordedBy), '') AS rb
//     FROM occurrences 
//     WHERE gbifID IN (${Array(CHUNK_SIZE).fill('?').join(',')})
//     AND (rh IS NOT NULL OR rb IS NOT NULL)`;
  
//   for (let i = 0; i < gbifIds.length; i += CHUNK_SIZE) {
//     const chunk = gbifIds.slice(i, i + CHUNK_SIZE).map(id => id.padStart(10, '0'));
//     const rows = await new Promise((resolve, reject) => {
//       occurrences_db.all(query, chunk, (err, result) => err ? reject(err) : resolve(result));
//     });
//     rows.forEach(({ rh, rb }) => references.add(`${rh || ''} | ${rb || ''}`.trim()));
//   }
  
//   return Array.from(references).filter(Boolean);
// };


// /**
//  * Obtiene todos los medios asociados a la especie (imagenes, videos, documentos, etc).
//  */
// exports.getMediaForSpecies = async (gbifIds) => {
//   return new Promise((resolve, reject) => {
//     media_db.all(`
//       SELECT * 
//       FROM multimedia 
//       WHERE gbifID IN (${gbifIds.map(() => '?').join(',')})
//     `, gbifIds, (err, rows) => {
//       if (err) return reject(err);
      
//       const validMedia = rows
//       .map(row => {
//         if (!row.identifier?.trim()) return null;

//         const cleanIdentifier = row.identifier.split(/[?#]/)[0];

//         const extension = getFileType(cleanIdentifier);
//         return {
//           type: row.type || TYPE_MAP[extension] || 'unknown',
//           format: row.format || FORMAT_MAP[extension] || 'unknown',
//           identifier: cleanIdentifier,
//           title: row.title?.slice(0, 500),
//           description: row.description?.slice(0, 1000),
//           creator: row.creator,
//           contributor: row.contributor,
//           publisher: row.publisher,
//           rightsHolder: row.rightsHolder
//         };
//       })
//       .filter(media => 
//         media !== null && 
//         media.type !== 'unknown' && 
//         media.format !== 'unknown'
//       );
      
//       resolve(validMedia);
//     });
//   });
// };


// /**
//  * Busca el vernacularName de la especie y lo devuelve para almacenar como common_name.
//  */
// exports.getCommonNameForSpecies = async (gbifIds) => {
//   if (!gbifIds.length) return "Unknown";

//   for (const id of gbifIds) {
//     const row = await new Promise((resolve, reject) => {
//       const query = `
//         SELECT vernacularName 
//         FROM verbatim 
//         WHERE gbifID = ? 
//           AND TRIM(vernacularName) != '' 
//         LIMIT 1
//       `;
//       verbatim_db.get(query, [id], (err, result) => {
//         if (err) return reject(err);
//         resolve(result);
//       });
//     });
//     if (row && row.vernacularName) {
//       return row.vernacularName;
//     }
//   }

//   return "Unknown";
// };


// /**
//  * Devuelve un objeto con todos los atributos des decription obtenidos de IUCN.
//  */
// exports.getDescriptionForSpecies = async (scientific_name) => {
//   return new Promise((resolve, reject) => {
//     const query = `
//       SELECT rationale, habitat, threats, population, populationTrend, range, useTrade, conservationActions
//       FROM iucn_assessments
//       WHERE scientificName = ?
//       LIMIT 1
//     `;
//     iucn_db.get(query, [scientific_name], (err, row) => {
//       if (err) {
//         return reject(err);
//       }
//       resolve(row || {
//         rationale: null,
//         habitat: null,
//         threats: null,
//         population: null,
//         populationTrend: null,
//         range: null,
//         useTrade: null,
//         conservationActions: null
//       });
//     });
//   });
// };


// /**
//  * Devuelve un mapa { countryCode: totalOccurrences } para todos los paises indicados.
//  * @param {string[]} countryCodes
//  * @returns {Promise<Record<string, number>>}
//  */
// exports.getOccurrencesByCountryBatch = (countryCodes) => {
//   return new Promise((resolve, reject) => {
//     const placeholders = countryCodes.map(() => '?').join(',');
//     const sql = `
//       SELECT countryCode, COUNT(*) AS cnt
//         FROM occurrences
//        WHERE countryCode IN (${placeholders})
//        GROUP BY countryCode;
//     `;
//     occurrences_db.all(sql, countryCodes, (err, rows) => {
//       occurrences_db.close();
//       if (err) return reject(err);
//       const result = countryCodes.reduce((acc, code) => {
//         acc[code] = 0; // default 0 si no aparece en rows
//         return acc;
//       }, {});
//       rows.forEach(r => result[r.countryCode] = r.cnt);
//       resolve(result);
//     });
//   });
// };

// const getFileType = (url) => {
//   try {
//     const parsed = new URL(url);
//     const extension = parsed.pathname
//     .toLowerCase()
//     .split('.')
//     .pop()
//     .replace(/[^a-z]/g, '');
    
//     return extension || 'unknown';
//   } catch {
//     return 'unknown';
//   }
// };