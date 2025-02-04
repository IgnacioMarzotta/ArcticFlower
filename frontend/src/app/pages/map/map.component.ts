import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import * as GLOBE from 'globe.gl';
import { SpeciesService } from '../../core/services/species.service';
import { GeoService } from '../../core/services/geo.service';

interface SpeciesPoint {
  lat: number;
  lng: number;
  name: string;
  category: string;
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements AfterViewInit {
  @ViewChild('globeContainer') globeContainer!: ElementRef;
  private globeInstance: any;

  constructor(
    private speciesService: SpeciesService,
    private geoService: GeoService
  ) {}

  ngAfterViewInit(): void {
    this.initializeGlobe();
    this.loadSpeciesData();
  }

  private initializeGlobe(): void {
    this.globeInstance = GLOBE.default()(this.globeContainer.nativeElement)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .pointRadius(0.5)
      .pointColor((d: SpeciesPoint) => this.getColorByCategory(d.category))
      .pointAltitude(0.1)
      .pointLabel((d: SpeciesPoint) => `
        <div class="globe-tooltip">
          <strong>${d.name}</strong><br>
          Categoría: ${d.category}
        </div>
      `);
  }
  

  private loadSpeciesData(): void {
    this.speciesService.getAllSpecies(1, 1000).subscribe({
      next: (response) => {
        const validSpecies = response.species.filter(sp => {
          // Permitir códigos con espacios y minúsculas
          const countryCode = sp.country?.replace(/\s/g, '').toUpperCase();
          return countryCode && countryCode.length === 2;
        });
  
        const points = validSpecies.map(sp => {
          const countryCode = sp.country.replace(/\s/g, '').toUpperCase();
          const coords = this.geoService.getCountryCoordinates(countryCode);
          
          // Debug: Verificar coordenadas
          if (!coords) {
            console.warn(`Código no reconocido: ${countryCode}`, sp);
            return null;
          }
  
          return {
            lat: coords.lat,
            lng: coords.lng,
            name: sp.common_name,
            category: sp.category
          };
        }).filter(Boolean);
  
        console.log('Puntos generados:', points);
        
        if (this.globeInstance) {
          this.globeInstance
            .pointsData(points)
            .pointColor((d: SpeciesPoint) => this.getColorByCategory(d.category));
        }
      },
      error: err => console.error('Error:', err)
    });
  }

  private getColorByCategory(category: string): string {
    const colors: { [key: string]: string } = {
      'CR': '#ff0000',
      'EN': '#ffa500',
      'VU': '#ffff00',
      'NT': '#adff2f',
      'EX': '#ff0000'
    };
    return colors[category] || '#ffffff';
  }
}