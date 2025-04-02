const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { getContinentName } = require('@brixtol/country-continent');
const GeoService = require('./geo.service');
const turf = require('@turf/turf');

const OCCURRENCES_DB_PATH = path.resolve(__dirname, '../data/gbif_occurrences.db');
const occurrences_db = new sqlite3.Database(OCCURRENCES_DB_PATH, sqlite3.OPEN_READONLY);

const MEDIA_DB_PATH = path.resolve(__dirname, '../data/gbif_multimedia.db');
const media_db = new sqlite3.Database(MEDIA_DB_PATH, sqlite3.OPEN_READONLY);

const VERBATIM_DB_PATH = path.resolve(__dirname, '../data/gbif_verbatim.db');
const verbatim_db = new sqlite3.Database(VERBATIM_DB_PATH, sqlite3.OPEN_READONLY);

const TYPE_MAP = {
  jpg: 'StillImage',
  jpeg: 'StillImage',
  png: 'StillImage',
  webp: 'StillImage',
  mp4: 'MovingImage',
  mpeg: 'Sound',
  wav: 'Sound',
  pdf: 'Document'
};

const FORMAT_MAP = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mpeg: 'audio/mpeg',
  wav: 'audio/wav',
  pdf: 'application/pdf'
};

exports.getGbifIdsForSpecies = async (taxonId) => {
  const taxonKey = parseInt(taxonId, 10);
  if (isNaN(taxonKey)) {
    throw new Error("taxonId debe ser un número válido");
  }
  
  const query = `
    SELECT gbifID 
    FROM occurrences 
    WHERE taxonKey = ? 
    LIMIT 1000`;
  
  const rows = await new Promise((resolve, reject) => {
    occurrences_db.all(query, [taxonKey], (err, result) => {
      err ? reject(err) : resolve(result);
    });
  });
  return rows.map(r => r.gbifID.toString());
};

exports.getUniqueLocations = async (gbifIds) => {
  return new Promise((resolve, reject) => {
    if (!gbifIds.length) return resolve([]);
    
    const query = `
      SELECT countryCode, decimalLatitude AS lat, decimalLongitude AS lng
      FROM occurrences
      WHERE gbifID IN (${gbifIds.map(() => '?').join(',')})
      ORDER BY gbifID
    `;
    
    occurrences_db.all(query, gbifIds, (err, rows) => {
      if (err) return reject(err);
      
      const seenCountries = new Set();
      const locations = [];
      
      rows.forEach(row => {
      
        if (!row.countryCode || !row.countryCode.trim()) return;
        const countryCode = row.countryCode.toUpperCase().substring(0, 2);
        
        if (seenCountries.has(countryCode)) return;
        
        const lat = parseFloat(row.lat);
        const lng = parseFloat(row.lng);
        if (!isValidCoordinate(lat, lng)) return;
        
        let continent;
        try {
          continent = getContinentName(countryCode);
        } catch (error) {
          console.error(`Error obteniendo continente para el código ${countryCode}: ${error.message}`);
          return;
        }
        
        const validContinents = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'];
        if (!continent || !validContinents.includes(continent)) {
          console.error(`Código ${countryCode} obtuvo continente inválido: ${continent}`);
          return;
        }
        
        seenCountries.add(countryCode);
        locations.push({
          country: countryCode,
          continent,
          lat,
          lng
        });
      });
      
      resolve(locations);
    });
  });
};

function isValidCoordinate(lat, lng) {
  return typeof lat === 'number' && typeof lng === 'number' &&
  !isNaN(lat) && !isNaN(lng) &&
  lat >= -90 && lat <= 90 &&
  lng >= -180 && lng <= 180;
}

function getContinent(countryCode) {
  const country = countries.find(c => c.cca2 === countryCode);
  return country?.region?.replace(/\s+/g, ' ').trim() || 'Unknown';
}

exports.getUniqueReferences = async (gbifIds) => {
  const CHUNK_SIZE = 999;
  const references = new Set();
  
  const query = `
    SELECT DISTINCT 
      NULLIF(TRIM(rightsHolder), '') AS rh,
      NULLIF(TRIM(recordedBy), '') AS rb
    FROM occurrences 
    WHERE gbifID IN (${Array(CHUNK_SIZE).fill('?').join(',')})
    AND (rh IS NOT NULL OR rb IS NOT NULL)`;
  
  for (let i = 0; i < gbifIds.length; i += CHUNK_SIZE) {
    const chunk = gbifIds.slice(i, i + CHUNK_SIZE).map(id => id.padStart(10, '0'));
    const rows = await new Promise((resolve, reject) => {
      occurrences_db.all(query, chunk, (err, result) => err ? reject(err) : resolve(result));
    });
    rows.forEach(({ rh, rb }) => references.add(`${rh || ''} | ${rb || ''}`.trim()));
  }
  
  return Array.from(references).filter(Boolean);
};

exports.getMediaForSpecies = async (gbifIds) => {
  return new Promise((resolve, reject) => {
    media_db.all(`
      SELECT * 
      FROM multimedia 
      WHERE gbifID IN (${gbifIds.map(() => '?').join(',')})
    `, gbifIds, (err, rows) => {
      if (err) return reject(err);
      
      const validMedia = rows
      .map(row => {
        // 1. Validar campo esencial
        if (!row.identifier?.trim()) return null;
        
        // 2. Limpiar URL
        const cleanIdentifier = row.identifier.split(/[?#]/)[0];
        
        // 3. Inferir tipo y formato
        const extension = getFileType(cleanIdentifier);
        return {
          type: row.type || TYPE_MAP[extension] || 'unknown',
          format: row.format || FORMAT_MAP[extension] || 'unknown',
          identifier: cleanIdentifier,
          title: row.title?.slice(0, 500), // Limitar longitud
          description: row.description?.slice(0, 1000),
          creator: row.creator,
          contributor: row.contributor,
          publisher: row.publisher,
          rightsHolder: row.rightsHolder
        };
      })
      .filter(media => 
        media !== null && 
        media.type !== 'unknown' && 
        media.format !== 'unknown'
      );
      
      resolve(validMedia);
    });
  });
};

exports.getCommonNameForSpecies = async (gbifIds) => {
}

const getFileType = (url) => {
  try {
    const parsed = new URL(url);
    const extension = parsed.pathname
    .toLowerCase()
    .split('.')
    .pop()
    .replace(/[^a-z]/g, '');
    
    return extension || 'unknown';
  } catch {
    return 'unknown';
  }
};