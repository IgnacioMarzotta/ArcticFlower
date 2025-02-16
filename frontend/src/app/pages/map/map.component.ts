import { Component, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import * as GLOBE from 'globe.gl';
import * as THREE from 'three';
import { SpeciesService } from '../../core/services/species.service';
import { CommonModule } from '@angular/common';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';

interface SpeciesPoint {
  lat: number;
  lng: number;
  name: string;
  category: string;
  size?: number;
  color?: string;
  country?: string;
  media?: string;
}

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  imports: [CommonModule, NgxSpinnerModule]
})

export class MapComponent implements AfterViewInit {
  @ViewChild('globeContainer') globeContainer!: ElementRef;
  private globeInstance: any;
  private markerSvg = `<svg viewBox="-4 0 36 36"><path fill="currentColor" d="M14,0 C21.732,0 28,5.641 28,12.6 C28,23.963 14,36 14,36 C14,36 0,24.064 0,12.6 C0,5.641 6.268,0 14,0 Z"></path><circle fill="black" cx="14" cy="14" r="7"></circle></svg>`;
  public isLoading: boolean = true;
  public selectedSpecies: SpeciesPoint | null = null;
  public isMobile: boolean = false;

  constructor(
    private speciesService: SpeciesService,
    private cdr: ChangeDetectorRef,
    private spinner: NgxSpinnerService 
  ) {}
  
  ngAfterViewInit(): void {
    this.isMobile = window.innerWidth < 768;
    this.spinner.show();
    this.initializeGlobe();
    this.loadSpeciesData();
    this.addClouds();
  
    setTimeout(() => {
      this.isLoading = false;
      this.spinner.hide(); // ✅ Ocultar el spinner
    }, 1500);
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
        const size = d.size || 20;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.color = d.color || 'black';
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'pointer';
        // Al hacer clic, se selecciona la especie para mostrarla en el panel:
        el.onclick = () => this.selectSpecies(d);
        return el;
      });

    // Configurar el zoom mínimo y máximo:
    const controls = this.globeInstance.controls();
    const globeRadius = this.globeInstance.getGlobeRadius();
    controls.minDistance = globeRadius * 1.5;
    controls.maxDistance = globeRadius * 3;
  }

  // Método para seleccionar una especie y mostrar el panel
  public selectSpecies(species: SpeciesPoint): void {
    this.selectedSpecies = species;
  }

  // Método para cerrar el panel
  public closePanel(): void {
    this.selectedSpecies = null;
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
                country: loc.country,
                media: species.media
              });
            });
          }
        });
  
        console.log('Puntos generados desde locations:', points);
  
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