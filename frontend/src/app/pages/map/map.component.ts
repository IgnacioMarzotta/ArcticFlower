import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import * as GLOBE from 'globe.gl';
import * as THREE from 'three';
import { SpeciesService } from '../../core/services/species.service';
import { GeoService } from '../../core/services/geo.service';
import * as turf from '@turf/turf';

interface SpeciesPoint {
  lat: number;
  lng: number;
  name: string;
  category: string;
  size?: number;
  color?: string;
  country?: string; 
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
    .globeImageUrl('../../../assets/img/globe/earth.jpg')
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
        const points: SpeciesPoint[] = [];
  
        // Para cada especie, recorremos su arreglo "locations"
        response.species.forEach((species: any) => {
          if (species.locations && Array.isArray(species.locations)) {
            species.locations.forEach((loc: { country: string; lat: number; lng: number; }) => {
              points.push({
                lat: loc.lat,
                lng: loc.lng,
                name: species.common_name,
                category: species.category,
                size: 30,
                color: this.getColorByCategory(species.category),
                country: loc.country
              });
            });
          }
        });
  
        console.log('Puntos generados desde locations:', points);
  
        // (Opcional) Si deseas aplicar clustering, puedes hacerlo aquí:
        // const clusteredPoints = this.clusterMarkers(points);
        // this.globeInstance.htmlElementsData(clusteredPoints);
  
        if (this.globeInstance) {
          this.globeInstance.htmlElementsData(points);
        }
      },
      error: err => console.error('Error al cargar especies:', err)
    });
  }
  
  /**
  * Calcula el punto promedio (lat, lng) de un arreglo de marcadores.
  */
  private averagePoint(points: SpeciesPoint[]): { lat: number, lng: number } {
    const sum = points.reduce((acc, p) => ({
      lat: acc.lat + p.lat,
      lng: acc.lng + p.lng
    }), { lat: 0, lng: 0 });
    return { lat: sum.lat / points.length, lng: sum.lng / points.length };
  }
  
  /**
  * Agrupa los marcadores que estén a menos de minClusterDistance entre sí.
  * Si un grupo tiene al menos clusterCountThreshold elementos, se crea un marcador
  * de cluster que muestra un contador. Si no, se mantienen los marcadores individuales.
  * @param points Arreglo de SpeciesPoint a clusterizar.
  * @returns Arreglo de SpeciesPoint con los clusters aplicados.
  */
  private clusterMarkers(points: SpeciesPoint[]): SpeciesPoint[] {
    const clusters: { points: SpeciesPoint[] }[] = [];
    const minClusterDistance = 0.5; // Distancia mínima en grados para agrupar (ajusta según sea necesario)
    const clusterCountThreshold = 3;  // Si un cluster tiene 3 o más puntos, se agrupa
    
    // Para cada marcador, se busca si ya existe un cluster cercano.
    points.forEach(pt => {
      const foundCluster = clusters.find(cluster => {
        // Se calcula la distancia (aproximada) entre el punto candidato y el centro promedio del cluster
        const avg = this.averagePoint(cluster.points);
        const d = Math.sqrt(Math.pow(pt.lat - avg.lat, 2) + Math.pow(pt.lng - avg.lng, 2));
        return d < minClusterDistance;
      });
      if (foundCluster) {
        foundCluster.points.push(pt);
      } else {
        clusters.push({ points: [pt] });
      }
    });
    
    // Se generan los nuevos marcadores:
    const result: SpeciesPoint[] = [];
    clusters.forEach(cluster => {
      if (cluster.points.length >= clusterCountThreshold) {
        const avg = this.averagePoint(cluster.points);
        result.push({
          lat: avg.lat,
          lng: avg.lng,
          name: `${cluster.points.length} especies`,
          category: 'cluster',
          size: 40,
          color: 'cyan'
        });
      } else {
        // Si el cluster tiene pocos puntos, se mantienen individualmente
        result.push(...cluster.points);
      }
    });
    return result;
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
  
  /**
  * Genera puntos aleatorios dentro de un polígono (GeoJSON) utilizando la técnica de muestreo por rechazo.
  * @param polygon Objeto GeoJSON con el polígono del país.
  * @param count Número de puntos a generar.
  * @returns Array de objetos con propiedades { lat, lng }.
  */
  private generateRandomPointsInPolygon(
    polygon: any,
    count: number
  ): { lat: number, lng: number }[] {
    // Obtenemos la bounding box del polígono: [minLng, minLat, maxLng, maxLat]
    const bbox = turf.bbox(polygon);
    const points: { lat: number, lng: number }[] = [];
    let attempts = 0;
    const maxAttempts = count * 100; // Para evitar bucles infinitos
    
    while (points.length < count && attempts < maxAttempts) {
      attempts++;
      const randLng = bbox[0] + Math.random() * (bbox[2] - bbox[0]);
      const randLat = bbox[1] + Math.random() * (bbox[3] - bbox[1]);
      const pt = turf.point([randLng, randLat]);
      // Verificamos si el punto se encuentra dentro del polígono
      if (turf.booleanPointInPolygon(pt, polygon)) {
        points.push({ lat: randLat, lng: randLng });
      }
    }
    return points;
  }
}