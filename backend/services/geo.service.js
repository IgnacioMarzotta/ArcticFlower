const countries = require('world-countries');
const turf = require('@turf/turf');

class GeoService {
    constructor() {
        this.countries = countries;
    }
    
    /**
    * Devuelve las coordenadas del pais a partir del codigo ISO
    * @param {string|undefined} rawCountryCode Codigo del pais (por ejemplo, "US", "IN")
    * @returns {{lat: number, lng: number}} o null si no se encuentra
    **/
    getCountryCoordinates(rawCountryCode) {
        if (!rawCountryCode) return null;
        
        // Limpiar y normalizar el codigo (solo letras)
        const countryCode = rawCountryCode.replace(/[^A-Za-z]/g, '').toUpperCase();
        
        const country = this.countries.find(c => 
            c.cca2 === countryCode || 
            c.cioc === countryCode ||
            c.cca3 === countryCode
        );
        
        if (!country) {
            console.error(`Codigo no encontrado: ${countryCode}`);
            return null;
        }
        
        return country.latlng && country.latlng.length === 2
        ? { lat: country.latlng[0], lng: country.latlng[1] }
        : null;
    }
    
    /**
    * Retorna el poligono (en formato GeoJSON) de las fronteras del pais.
    * Si el pais dispone de la propiedad "geojson", se la retorna.
    * De lo contrario, se genera un poligono aproximado (circulo) usando el centro y el area.
    * @param {string|undefined} rawCountryCode Codigo del pais (por ejemplo, "US", "IN", etc.)
    * @returns {Object|null} Objeto GeoJSON de tipo Polygon o null si no es posible.
    **/
    getCountryPolygon(rawCountryCode) {
        if (!rawCountryCode) return null;
        
        const countryCode = rawCountryCode.replace(/[^A-Za-z]/g, '').toUpperCase();
        
        const country = this.countries.find(c => 
            c.cca2 === countryCode ||
            c.cioc === countryCode ||
            c.cca3 === countryCode
        );
        
        if (!country) {
            console.error(`Codigo no encontrado: ${countryCode}`);
            return null;
        }
        
        // Si el pais ya dispone de la propiedad "geojson", se devuelve esa informacion.
        if (country.geojson) {
            return country.geojson;
        }
        
        // De lo contrario, si se dispone de las coordenadas del centro y del area, se genera un poligono circular aproximado.
        if (country.latlng && country.area) {
            // Calcula el radio (en km) a partir del área (suponiendo área = π * r²)
            const radiusKm = Math.sqrt(country.area / Math.PI);
            // Convierte el radio de km a grados (aproximadamente, 1 grado ~ 111 km en latitud)
            const radiusDeg = radiusKm / 111;
            // Numero de lados para aproximar el circulo
            const numSides = 512;
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
            // Cerramos el poligono repitiendo el primer punto
            coords.push(coords[0]);
            
            return {
                type: "Polygon",
                coordinates: [coords]
            };
        }
        
        return null;
    }
    
    /**
     * Funcion auxiliar que genera un punto aleatorio dentro de un poligono usando muestreo por rechazo.
     * @param {Object} polygon Objeto GeoJSON de tipo Polygon o MultiPolygon
     * @returns {Object} { lat, lng }
    **/
    generateRandomPointInPolygon(polygon) {
        // Obtiene el bbox del poligono: [minLng, minLat, maxLng, maxLat]
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
        // Fallback: retornar el centro del poligono
        const centroid = turf.centroid(polygon);
        return { lat: centroid.geometry.coordinates[1], lng: centroid.geometry.coordinates[0] };
    }
}

module.exports = new GeoService();