import { Injectable } from '@angular/core';
import countries from 'world-countries';

@Injectable({
  providedIn: 'root'
})
export class GeoService {
  private countries = countries;

  getCountryCoordinates(rawCountryCode: string | undefined): { lat: number; lng: number } | null {
    if (!rawCountryCode) return null;
  
    // Limpiar y normalizar el código
    const countryCode = rawCountryCode
      .replace(/[^A-Za-z]/g, '') // Eliminar caracteres no alfabéticos
      .toUpperCase();
  
    const country = this.countries.find(c => 
      c.cca2 === countryCode || 
      c.cioc === countryCode ||
      c.cca3 === countryCode
    );
  
    // Debug: Verificar coincidencia
    if (!country) {
      console.error(`Código no encontrado: ${countryCode}`);
      return null;
    }
  
    return country.latlng?.length === 2 
      ? { lat: country.latlng[0], lng: country.latlng[1] } 
      : null;
  }

  /**
   * Retorna el polígono (en formato GeoJSON) de las fronteras del país.
   * Si el país dispone de una propiedad "geojson" se la retorna,
   * de lo contrario se genera un polígono aproximado (círculo) usando el centro y el área.
   * @param rawCountryCode Código del país (por ejemplo, "US", "IN", etc.)
   * @returns Objeto GeoJSON de tipo Polygon o null si no es posible.
   */
  getCountryPolygon(rawCountryCode: string | undefined): any | null {
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
    if ((country as any).geojson) {
      return (country as any).geojson;
    }

    // Si se dispone de las coordenadas del centro y del área, se genera un polígono circular aproximado.
    if (country.latlng && country.area) {
      // Calcula el radio (en km) a partir del área (asumiendo área = π * r²)
      const radiusKm = Math.sqrt(country.area / Math.PI);
      // Convierte el radio en km a grados (1 grado ~ 111 km en la latitud)
      const radiusDeg = radiusKm / 111;
      const numSides = 32; // Número de lados para aproximar el círculo
      const coords: number[][] = [];

      // El centro: en world-countries, country.latlng[0] es lat y [1] es lng
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

      // Retornamos un objeto GeoJSON de tipo Polygon
      return {
        type: "Polygon",
        coordinates: [coords]
      };
    }

    return null;
  }
}