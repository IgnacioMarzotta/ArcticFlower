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
}