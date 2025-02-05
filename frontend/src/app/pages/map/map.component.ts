import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import * as GLOBE from 'globe.gl';
import * as THREE from 'three';
import { SpeciesService } from '../../core/services/species.service';
import { GeoService } from '../../core/services/geo.service';

interface SpeciesPoint {
  lat: number;
  lng: number;
  name: string;
  category: string;
  size?: number;
  color?: string;
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements AfterViewInit {
  @ViewChild('globeContainer') globeContainer!: ElementRef;
  private globeInstance: any;
  private markerSvg = `<svg viewBox="-4 0 36 36"><path fill="currentColor" d="M14,0 C21.732,0 28,5.641 28,12.6 C28,23.963 14,36 14,36 C14,36 0,24.064 0,12.6 C0,5.641 6.268,0 14,0 Z"></path><circle fill="black" cx="14" cy="14" r="7"></circle></svg>`;
  public isLoading: boolean = true;
  
  constructor(
    private speciesService: SpeciesService,
    private geoService: GeoService
  ) {}
  
  ngAfterViewInit(): void {
    this.initializeGlobe();
    this.loadSpeciesData();
    this.addClouds();
    this.isLoading = false;
  }
  
  private initializeGlobe(): void {
    this.globeInstance = GLOBE.default({ animateIn: false })(this.globeContainer.nativeElement)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .htmlElementsData([]) // capa de marcadores vacía
      .htmlElement((d: SpeciesPoint) => {
        const el = document.createElement('div');
        el.innerHTML = this.markerSvg;
        el.style.position = 'absolute';
        el.style.transform = 'translate(-50%, -50%)';
        const size = d.size || 30;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.color = d.color || 'black';
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'pointer';
        el.onclick = () => console.info('Marcador clickeado:', d);
        return el;
      });
  }
  
  // Función para agregar las nubes (clouds) sobre el globo
  private addClouds(): void {
    const CLOUDS_IMG_URL = "../../../assets/img/globe/clouds.png"; // Asegúrate de tener la imagen en tus assets
    const CLOUDS_ALT = 0.004;
    const CLOUDS_ROTATION_SPEED = -0.003; // velocidad en grados por frame
    new THREE.TextureLoader().load(CLOUDS_IMG_URL, (cloudsTexture: THREE.Texture) => {
      // Obtenemos el radio actual del globo
      const globeRadius = this.globeInstance.getGlobeRadius();
      const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(globeRadius * (1 + CLOUDS_ALT), 75, 75),
        new THREE.MeshPhongMaterial({ map: cloudsTexture, transparent: true })
      );
      // Añadimos la malla de nubes a la escena
      this.globeInstance.scene().add(clouds);
      // Función recursiva para animar la rotación de las nubes
      const rotateClouds = () => {
        clouds.rotation.y += CLOUDS_ROTATION_SPEED * Math.PI / 180;
        requestAnimationFrame(rotateClouds);
      };
      rotateClouds();
    });
  }
  
  private loadSpeciesData(): void {
    this.speciesService.getAllSpecies(1, 1000).subscribe({
      next: (response) => {
        // Filtramos las especies con códigos de país válidos
        const validSpecies = response.species.filter(sp => {
          const countryCode = sp.country?.replace(/\s/g, '').toUpperCase();
          return countryCode && countryCode.length === 2;
        });
        
        // Agrupamos las especies por país
        const speciesByCountry = validSpecies.reduce((acc, sp) => {
          const countryCode = sp.country.replace(/\s/g, '').toUpperCase();
          if (!acc[countryCode]) { acc[countryCode] = []; }
          acc[countryCode].push(sp);
          return acc;
        }, {} as { [countryCode: string]: any[] });
        
        // Aquí puedes definir tu lógica de zoom; en este ejemplo usamos una función simple
        const isZoomedOut = this.checkIfZoomedOut();
        
        let points: SpeciesPoint[] = [];
        
        Object.keys(speciesByCountry).forEach(countryCode => {
          const coords = this.geoService.getCountryCoordinates(countryCode);
          if (!coords) return;
          
          if (isZoomedOut) {
            // En vista alejanda, mostramos un marcador agrupado por país
            points.push({
              lat: coords.lat,
              lng: coords.lng,
              name: `${speciesByCountry[countryCode].length} especies`,
              category: 'cluster',
              size: 40,
              color: 'cyan'
            });
          } else {
            // En vista cercana, dispersamos los marcadores dentro del país
            const dispersedPoints = this.generateRandomPointsInCountry(coords, speciesByCountry[countryCode].length);
            dispersedPoints.forEach((p, index) => {
              const species = speciesByCountry[countryCode][index];
              points.push({
                lat: p.lat,
                lng: p.lng,
                name: species.common_name,
                category: species.category,
                size: 20 + Math.random() * 20,
                color: this.getColorByCategory(species.category)
              });
            });
          }
        });
        
        console.log('Puntos generados:', points);
        
        if (this.globeInstance) {
          // Actualizamos la capa de HTML Markers con los puntos generados
          this.globeInstance.htmlElementsData(points);
        }
      },
      error: err => console.error('Error al cargar especies:', err)
    });
  }
  
  private checkIfZoomedOut(): boolean {
    if (!this.globeInstance) return true;
    const camera = this.globeInstance.camera();
    const distance = camera.position.length();
    const zoomOutThreshold = 400; // Ajusta este valor según la escala de tu escena
    return distance > zoomOutThreshold;
  }
  
  /**
  * Genera puntos aleatorios dentro de un radio (en grados) alrededor del centro,
  * asegurando que la distancia entre dos puntos sea al menos minSeparation.
  * @param center Coordenadas centrales (lat, lng) del país.
  * @param count Número de puntos a generar.
  * @returns Arreglo de coordenadas con la dispersión aplicada.
  */
  private generateRandomPointsInCountry(
    center: { lat: number, lng: number },
    count: number
  ): { lat: number, lng: number }[] {
    const points: { lat: number, lng: number }[] = [];
    const dispersionRadius = 5.0;
    const minSeparation = 0.7;
    let attempts = 0;
    const maxAttempts = count * 10;
    
    while (points.length < count && attempts < maxAttempts) {
      attempts++;
      const angle = Math.random() * 2 * Math.PI;
      const radius = dispersionRadius * Math.sqrt(Math.random());
      const latOffset = radius * Math.cos(angle);
      const lngOffset = radius * Math.sin(angle);
      const candidate = {
        lat: center.lat + latOffset,
        lng: center.lng + lngOffset
      };
      
      // Comprobamos que la distancia entre el candidato y todos los puntos ya aceptados sea mayor o igual a minSeparation
      const isTooClose = points.some(p => {
        const d = Math.sqrt(Math.pow(candidate.lat - p.lat, 2) + Math.pow(candidate.lng - p.lng, 2));
        return d < minSeparation;
      });
      
      if (!isTooClose) {
        points.push(candidate);
      }
    }

    // Si no se pudieron generar todos los puntos con separación mínima, se retornan los que se consiguieron
    return points;
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