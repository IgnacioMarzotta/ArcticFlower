const countries = require('world-countries');
const turf = require('@turf/turf');

class GeoService {
    constructor() {
        this.countries = countries;
    }
    
    /**
    * Retorna las coordenadas centrales del país a partir del código.
    * @param {string|undefined} rawCountryCode Código del país (por ejemplo, "US", "IN")
    * @returns {{lat: number, lng: number}} o null si no se encuentra
    */
    getCountryCoordinates(rawCountryCode) {
        if (!rawCountryCode) return null;
        
        // Limpiar y normalizar el código (solo letras)
        const countryCode = rawCountryCode.replace(/[^A-Za-z]/g, '').toUpperCase();
        
        const country = this.countries.find(c => 
            c.cca2 === countryCode || 
            c.cioc === countryCode ||
            c.cca3 === countryCode
        );
        
        if (!country) {
            console.error(`Código no encontrado: ${countryCode}`);
            return null;
        }
        
        return country.latlng && country.latlng.length === 2
        ? { lat: country.latlng[0], lng: country.latlng[1] }
        : null;
    }
    
    /**
    * Retorna el polígono (en formato GeoJSON) de las fronteras del país.
    * Si el país dispone de la propiedad "geojson", se la retorna.
    * De lo contrario, se genera un polígono aproximado (círculo) usando el centro y el área.
    * @param {string|undefined} rawCountryCode Código del país (por ejemplo, "US", "IN", etc.)
    * @returns {Object|null} Objeto GeoJSON de tipo Polygon o null si no es posible.
    */
    getCountryPolygon(rawCountryCode) {
        if (!rawCountryCode) return null;
        
        const countryCode = rawCountryCode.replace(/[^A-Za-z]/g, '').toUpperCase();
        
        const country = this.countries.find(c => 
            c.cca2 === countryCode ||
            c.cioc === countryCode ||
            c.cca3 === countryCode
        );
        
        if (!country) {
            console.error(`Código no encontrado: ${countryCode}`);
            return null;
        }
        
        // Si el país ya dispone de la propiedad "geojson", se retorna esa información.
        if (country.geojson) {
            return country.geojson;
        }
        
        // Si se dispone de las coordenadas del centro y del área, se genera un polígono circular aproximado.
        if (country.latlng && country.area) {
            // Calcula el radio (en km) a partir del área (suponiendo área = π * r²)
            const radiusKm = Math.sqrt(country.area / Math.PI);
            // Convierte el radio de km a grados (aproximadamente, 1 grado ~ 111 km en latitud)
            const radiusDeg = radiusKm / 111;
            const numSides = 32; // Número de lados para aproximar el círculo
            const coords = [];
            // El centro: country.latlng[0] es lat y [1] es lng
            const centerLat = country.latlng[0];
            const centerLng = country.latlng[1];
            
            for (let i = 0; i < numSides; i++) {
                const angle = (2 * Math.PI * i) / numSides;
                const lngOffset = radiusDeg * Math.cos(angle);
                const latOffset = radiusDeg * Math.sin(angle);
                coords.push([centerLng + lngOffset, centerLat + latOffset]);
            }
            // Cerramos el polígono repitiendo el primer punto
            coords.push(coords[0]);
            
            return {
                type: "Polygon",
                coordinates: [coords]
            };
        }
        
        return null;
    }
    
    /**
     * Función auxiliar que genera un punto aleatorio dentro de un polígono
     * usando muestreo por rechazo.
     * @param {Object} polygon Objeto GeoJSON de tipo Polygon o MultiPolygon
     * @returns {Object} { lat, lng }
    */
    generateRandomPointInPolygon(polygon) {
        // Obtiene el bbox del polígono: [minLng, minLat, maxLng, maxLat]
        const bbox = turf.bbox(polygon);
        let attempts = 0;
        const maxAttempts = 1000;
        while (attempts < maxAttempts) {
            attempts++;
            const randLng = bbox[0] + Math.random() * (bbox[2] - bbox[0]);
            const randLat = bbox[1] + Math.random() * (bbox[3] - bbox[1]);
            const pt = turf.point([randLng, randLat]);
            if (turf.booleanPointInPolygon(pt, polygon)) {
                return { lat: randLat, lng: randLng };
            }
        }
        // Fallback: retornar el centro del polígono
        const centroid = turf.centroid(polygon);
        return { lat: centroid.geometry.coordinates[1], lng: centroid.geometry.coordinates[0] };
    }
}

module.exports = new GeoService();