import { Component, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import * as GLOBE from 'globe.gl';
import * as THREE from 'three';
import { SpeciesService } from '../../core/services/species.service';
import { ClusterService } from '../../core/services/cluster.service';
import { CommonModule } from '@angular/common';
import { NgxSpinnerComponent, NgxSpinnerService } from 'ngx-spinner';
import { FormsModule } from '@angular/forms';
import 'flag-icons/css/flag-icons.min.css';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, finalize, catchError, filter } from 'rxjs/operators';
import { SpeciesPoint, ClusterPoint } from '../../core/models/map.models';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  imports: [CommonModule, FormsModule, NgxSpinnerComponent],
  standalone: true,
  
})

export class MapComponent implements AfterViewInit {
  @ViewChild('globeContainer') globeContainer!: ElementRef;
  private globeInstance: any;
  private markerSvg = `<svg viewBox="-4 0 36 36"><path fill="currentColor" d="M14,0 C21.732,0 28,5.641 28,12.6 C28,23.963 14,36 14,36 C14,36 0,24.064 0,12.6 C0,5.641 6.268,0 14,0 Z"></path><circle fill="black" cx="14" cy="14" r="7"></circle></svg>`;
  public isLoading: boolean = true;
  public isMobile: boolean = false;

  public selectedSpecies: SpeciesPoint | null = null;
  public selectedCluster: ClusterPoint | null = null;
  private clusterPoints: ClusterPoint[] = [];
  private expandedClusterId: string | null = null;
  private expandedSpeciesMarkers: SpeciesPoint[] = [];

  //Sistema de busqueda
  public searchTerm: string = "";
  public filteredClusters: ClusterPoint[] = [];
  public filteredSpecies: SpeciesPoint[] = [];
  private searchSubject = new Subject<string>();
  public searchLoading = false;
  private minSearchLength = 3;

  constructor(
    private speciesService: SpeciesService,
    private cdr: ChangeDetectorRef,
    private spinner: NgxSpinnerService,
    private clusterService: ClusterService,
  ) {}

  ngOnInit(): void {
    this.setupSearch();
  }
  
  ngAfterViewInit(): void {
    this.isMobile = window.innerWidth < 768;
    this.spinner.show();
    this.initializeGlobe();
    this.loadClusters();
    this.addClouds();
    
    setTimeout(() => {
      this.isLoading = false;
      this.spinner.hide();
    }, 1500);
  }
  
  private initializeGlobe(): void {
    this.globeInstance = GLOBE.default({ animateIn: false })(this.globeContainer.nativeElement)
      .globeImageUrl('../../../assets/img/globe/earth.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      // Inicialmente vacia; se actualiza con clusters o especies segun la interaccion.
      .htmlElementsData([])
      .htmlElement((d: SpeciesPoint | ClusterPoint) => {
        // Si es un Cluster (tiene 'count'), muestra la bandera y un badge con el conteo.
        if ('count' in d) {
          const markerDiv = document.createElement('div');
          markerDiv.style.position = 'absolute';
          markerDiv.style.transform = 'translate(-50%, -50%)';
          markerDiv.style.width = '50px';
          markerDiv.style.height = '50px';
          markerDiv.style.border = '2px solid #fff';
          markerDiv.style.borderRadius = '50%';
          markerDiv.style.backgroundColor = d.color;
          markerDiv.style.display = 'flex';
          markerDiv.style.alignItems = 'center';
          markerDiv.style.justifyContent = 'center';
          markerDiv.style.cursor = 'pointer';
          markerDiv.style.pointerEvents = 'auto'; 
          markerDiv.style.zIndex = '9999';

          // Crea el elemento de la bandera usando flag-icons.
          const flagElement = document.createElement('span');
          // Se asume que d.country contiene el codigo ISO en mayusculas o minusculas.
          flagElement.className = `fi fi-${d.country.toLowerCase()}`;
          flagElement.style.fontSize = '50px';
          flagElement.style.width = '100%';
          flagElement.style.borderRadius = '50%';
  
          // Crea el badge de conteo
          const countBadge = document.createElement('div');
          countBadge.innerText = d.count.toString();
          countBadge.style.position = 'absolute';
          countBadge.style.bottom = '0';
          countBadge.style.right = '0';
          countBadge.style.backgroundColor = 'rgba(0,0,0,0.7)';
          countBadge.style.color = 'white';
          countBadge.style.borderRadius = '50%';
          countBadge.style.width = '20px';
          countBadge.style.height = '20px';
          countBadge.style.display = 'flex';
          countBadge.style.alignItems = 'center';
          countBadge.style.justifyContent = 'center';
          countBadge.style.fontSize = '12px';
  
          markerDiv.appendChild(flagElement);
          markerDiv.appendChild(countBadge);
  
          // Al hacer click en un cluster, se ejecuta la funcion para cargar las especies asociadas.
          markerDiv.onclick = () => this.onClusterClick(d as ClusterPoint);
          return markerDiv;
        } else {
          // Si es una especie individual, se muestra el marcador SVG.
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
          el.onclick = () => this.selectSpecies(d);
          return el;
        }
      });  

    //Zoom minimo y maximo:
    const controls = this.globeInstance.controls();
    const globeRadius = this.globeInstance.getGlobeRadius();
    controls.minDistance = globeRadius * 1.5;
    controls.maxDistance = globeRadius * 3;
  }

  onClusterClick(cluster: ClusterPoint): void {
    if (this.expandedClusterId === cluster.id) {
      this.expandedClusterId = null;
      this.expandedSpeciesMarkers = [];
      this.selectedCluster = null;
      this.updateGlobeMarkers();
      return;
    }
    this.selectedSpecies = null;
    this.flyToMarker(cluster);
    this.expandedClusterId = cluster.id;
    this.selectedCluster = cluster;
    this.spinner.show();
    this.speciesService.getSpeciesByCountry(cluster.country).subscribe({
      next: (speciesArray: any[]) => {
        this.expandedSpeciesMarkers = speciesArray.map(species => {
          if (species.locations && species.locations.length > 0) {
            const loc = species.locations[0];
            return {
              id: species._id,
              lat: loc.lat,
              lng: loc.lng,
              name: species.common_name,
              category: species.category,
              size: 30,
              color: this.getColorByCategory(species.category),
              country: loc.country
            } as SpeciesPoint;
          }
          return null;
        }).filter(Boolean) as SpeciesPoint[];
        this.updateGlobeMarkers();
        this.spinner.hide();
      },
      error: err => {
        console.error('Error al cargar especies para el país:', err);
        this.spinner.hide();
      }
    });
  }

  private updateGlobeMarkers(): void {
    const markers: (SpeciesPoint | ClusterPoint)[] = [];
    this.clusterPoints.forEach(cluster => {
      if (this.expandedClusterId === cluster.id && this.expandedSpeciesMarkers.length > 0) {
        markers.push(...this.expandedSpeciesMarkers);
      } else {
        markers.push(cluster);
      }
    });
    if (this.globeInstance) {
      this.globeInstance.htmlElementsData(markers);
    }
  }

  private loadClusters(): void {
    this.clusterService.getClusters().subscribe({
      next: (clusters: any[]) => {
        this.clusterPoints = clusters.map(cluster => ({
          id: cluster._id,
          lat: cluster.lat,
          lng: cluster.lng,
          name: cluster.countryName || cluster.country,
          category: cluster.worstCategory,
          size: 50,
          color: this.getColorByCategory(cluster.worstCategory),
          country: cluster.country,
          count: cluster.count
        }));
        // Reiniciar estado de cluster expandido
        this.expandedClusterId = null;
        this.expandedSpeciesMarkers = [];
        this.updateGlobeMarkers();
      },
      error: err => console.error('Error al cargar clusters:', err)
    });
  }

  public selectSpecies(species: SpeciesPoint): void {
    this.flyToMarker(species);
    this.isLoading = true;
    this.speciesService.getSpeciesDetail(species.id).subscribe({
      next: (detail) => {
        this.selectedSpecies = detail;
        this.isLoading = false;
        console.warn('Detalle de la especie:', detail);
      },
      error: (err) => console.error('Error al obtener el detalle de la especie:', err)
    });
  }

  // Método para cerrar el panel lateral
  public closePanel(): void {
    this.selectedSpecies = null;
  }

  // Funcion para agregar las nubes (clouds) sobre el globo
  private addClouds(): void {
    const CLOUDS_IMG_URL = "../../../assets/img/globe/clouds.png";
    const CLOUDS_ALT = 0.004;
    const CLOUDS_ROTATION_SPEED = -0.003;
    new THREE.TextureLoader().load(CLOUDS_IMG_URL, (cloudsTexture: THREE.Texture) => {
      // Obtener el radio actual del globo
      const globeRadius = this.globeInstance.getGlobeRadius();
      const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(globeRadius * (1 + CLOUDS_ALT), 75, 75),
        new THREE.MeshPhongMaterial({ map: cloudsTexture, transparent: true })
      );
      // Agregar la mesh de nubes
      this.globeInstance.scene().add(clouds);
      // Funcion recursiva para animar la rotacion de las nubes
      const rotateClouds = () => {
        clouds.rotation.y += CLOUDS_ROTATION_SPEED * Math.PI / 180;
        requestAnimationFrame(rotateClouds);
      };
      rotateClouds();
    });
  }
  
  //Sin uso actual, funcion encargada de traer TODAS las especies
  private loadSpeciesData(): void {
    let allSpecies: SpeciesPoint[] = [];
    this.speciesService.getAllSpecies(1, 1000).subscribe({
      next: (response) => {
        const points: SpeciesPoint[] = [];
        response.species.forEach((species: any) => {
          if (species.locations && Array.isArray(species.locations)) {
            species.locations.forEach((loc: { country: string; lat: number; lng: number; }) => {
              points.push({
                id: species._id,
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
        console.log('Puntos generados:', points);
        allSpecies = points;
        if (this.globeInstance) {
          this.globeInstance.htmlElementsData(points);
        }
      },
      error: err => console.error('Error al cargar especies:', err)
    });
  }
  
  //Definicion de colores por categoria
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

  //Funcion para navegar y hacer zoom en un marcado, especie o cluster.
  private flyToMarker(marker: SpeciesPoint | ClusterPoint): void {
    if (this.globeInstance && marker) {
      const altitude = ('count' in marker) ? 1.5 : 1;
      this.globeInstance.pointOfView(
        { lat: marker.lat, lng: marker.lng, altitude: altitude }, 2000
      );
    }
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(term => term.length >= this.minSearchLength), // Filtramos términos cortos
      switchMap(term => {
        this.searchLoading = true;
        return this.speciesService.searchSpecies(term).pipe(
          finalize(() => this.searchLoading = false),
          catchError(() => of([])) // Manejo de errores
        );
      })
    ).subscribe(species => this.filteredSpecies = species);
  }

  onSearchInput(term: string): void {
    // Filtrado de clusters
    this.filteredClusters = term.length >= this.minSearchLength 
      ? this.clusterPoints.filter(cluster => 
          cluster.name.toLowerCase().includes(term.toLowerCase()) ||
          cluster.country.toLowerCase().includes(term.toLowerCase())
        )
      : [];
    
    // Disparamos búsqueda solo si cumple longitud mínima
    if (term.length >= this.minSearchLength) {
      this.searchSubject.next(term);
    } else {
      this.filteredSpecies = [];
    }
  }

  // Type guards
  isCluster(result: ClusterPoint | SpeciesPoint): result is ClusterPoint {
    return 'count' in result;
  }

  isSpecies(result: ClusterPoint | SpeciesPoint): result is SpeciesPoint {
    return 'common_name' in result;
  }
}