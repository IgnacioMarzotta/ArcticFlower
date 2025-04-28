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
import { SpeciesPoint, ClusterPoint, SpeciesMedia } from '../../core/models/map.models';
import countries from 'world-countries';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  imports: [CommonModule, FormsModule, NgxSpinnerComponent],
  standalone: true,
  
})

export class MapComponent implements AfterViewInit {
  @ViewChild('globeContainer') globeContainer!: ElementRef;
  
  //Globe instance, markers and mobile/desktop view
  private globeInstance: any;
  private markerSvg = `<svg viewBox="-4 0 36 36"><path fill="currentColor" d="M14,0 C21.732,0 28,5.641 28,12.6 C28,23.963 14,36 14,36 C14,36 0,24.064 0,12.6 C0,5.641 6.268,0 14,0 Z"></path><circle fill="black" cx="14" cy="14" r="7"></circle></svg>`;
  public isLoading: boolean = true;
  public isMobile: boolean = false;
  
  //Markers and current selections
  public selectedSpecies: SpeciesPoint | null = null;
  public selectedCluster: ClusterPoint | null = null;
  private clusterPoints: ClusterPoint[] = [];
  private expandedClusterId: string | null = null;
  private expandedSpeciesMarkers: SpeciesPoint[] = [];
  
  //Search system
  public searchTerm: string = "";
  public filteredClusters: ClusterPoint[] = [];
  public filteredSpecies: SpeciesPoint[] = [];
  private searchSubject = new Subject<string>();
  public searchLoading = false;
  private minSearchLength = 3;
  public daysToCheck = 14;
  
  //Media carrousel
  public showImageInfo: boolean = false;
  currentImageIndex = 0;
  
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
    this.addClouds();
    this.loadAllClusters();
    
    setTimeout(() => {
      this.isLoading = false;
      this.spinner.hide();
    }, 1500);
  }
  
  private initializeGlobe(): void {
    this.globeInstance = GLOBE.default({ animateIn: false })(this.globeContainer.nativeElement)
    .globeImageUrl('../../../assets/img/globe/earth.jpg')
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .polygonsData(countries)
    .polygonAltitude(0.1)
    .polygonCapColor(() => 'rgba(200,200,200,0.3)')
    .polygonSideColor(() => 'rgba(50,50,50,0.15)')
    .polygonStrokeColor(() => '#111')
    .polygonLabel(({ properties }: { properties: any }) => `<b>${properties.name.common}</b>`)
    .htmlElementsData([])
    .htmlElement((d: SpeciesPoint | ClusterPoint) => {
      if ('count' in d) {
        const markerDiv = document.createElement('div');
        markerDiv.style.position = 'absolute';
        markerDiv.style.transform = 'translate(-50%, -50%)';
        markerDiv.style.width = `${d.size}px`;
        markerDiv.style.height = `${d.size}px`;
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
        flagElement.className = `fi fi-${d.country.toLowerCase()}`;
        flagElement.style.fontSize = `${d.size}px`;
        flagElement.style.width = '100%';
        flagElement.style.borderRadius = '50%';
        
        // Badge de conteo
        const countBadge = document.createElement('div');
        countBadge.innerText = d.count.toString();
        countBadge.style.position = 'absolute';
        countBadge.style.bottom = '-10px';
        countBadge.style.right = '40%';
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
    controls.minDistance = globeRadius * 1.01;
    controls.maxDistance = globeRadius * 2.3;
  }
  
  onClusterClick(cluster: ClusterPoint): void {
    this.clearCurrentSelection();
    if (this.expandedClusterId === cluster.id) {
      return;
    }
    this.checkClusterUpdate(cluster);
    console.log("Cluster seleccionado:", cluster);
    this.expandedClusterId = cluster.id;
    this.selectedCluster = cluster;
    this.spinner.show();
    this.loadClusterSpecies(cluster);
    this.flyToMarker(cluster);
  }
  
  checkClusterUpdate(cluster: ClusterPoint): void {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - this.daysToCheck);
    if (new Date(cluster.updatedAt) < oneWeekAgo) {
      console.log("El cluster no ha sido actualizado en el plazo establecido. Se realizará una llamada a la API para actualizar datos.");
      this.clusterService.updateClusterStatusFromAPI(cluster).subscribe({
        next: resp => {
          console.log("RESPUESTA ENTERA:", resp);
          console.log("Cluster actualizado:", resp.cluster);
          console.log("GBIF details:   ", resp.gbif);
          this.isLoading = false;
        },
        error: err => {
          console.error('Error al obtener detalles de GBIF:', err);
          this.isLoading = false;
        }
      });
    }
    else {
      //No actualizar
      console.log("El cluster ha sido actualizado recientemente. No es necesario realizar una llamada a la API externa.");
      return;
    }
  }
  
  checkSpeciesUpdate(species: SpeciesPoint): void {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - this.daysToCheck);
    if (new Date(species.updatedAt) < oneWeekAgo) {
      //Actualizar
      console.log("La especie no ha sido actualizada en el plazo establecido. Se realizará una llamada a la API para actualizar datos.");
      this.speciesService.updateSpeciesStatusFromAPI(species).subscribe({
        next: resp => {
          this.isLoading = false;
        },
        error: err => {
          console.error('Error al obtener detalles de API:', err);
          this.isLoading = false;
        }
      });
    }
    else {
      //No actualizar
      console.log("La especie ha sido actualizado recientemente. No es necesario realizar una llamada a la API externa.");
      return;
    }
  }
  
  loadClusterSpecies(cluster: ClusterPoint): void {
    this.speciesService.getSpeciesByCountry(cluster.country).subscribe({
      next: (speciesArray: any[]) => {
        this.expandedSpeciesMarkers = speciesArray.map(species => {
          if (species.locations && Array.isArray(species.locations)) {
            // Filtrar la ubicación que corresponde al pais del cluster, quiere decir que si una especie esta presente en varios paises, solo voy a generar un marcador dentro del cluster en cuestion.
            const loc = species.locations.find((loc: any) => loc.country.toUpperCase() === cluster.country);
            if (loc) {
              return {
                id: species._id,
                lat: loc.lat,
                lng: loc.lng,
                name: species.common_name,
                category: species.category,
                size: 20,
                color: this.getColorByCategory(species.category),
                country: loc.country,
                updatedAt: species.updatedAt,
                taxon_id: species.taxon_id,
              } as SpeciesPoint;
            }
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
  
  private loadAllClusters(): void {
    this.clusterService.getClusters().subscribe({
      next: (clusters: any[]) => {
        this.clusterPoints = clusters.map(cluster => ({
          id: cluster._id,
          lat: cluster.lat,
          lng: cluster.lng,
          name: cluster.countryName || cluster.country,
          category: cluster.worstCategory,
          size: cluster.markerSize,
          color: this.getColorByCategory(cluster.worstCategory),
          country: cluster.country,
          count: cluster.count,
          updatedAt: cluster.updatedAt
        }));
        
        this.expandedClusterId = null;
        this.expandedSpeciesMarkers = [];
        this.updateGlobeMarkers();
      },
      error: err => console.error('Error al cargar clusters:', err)
    });
  }
  
  public selectSpecies(species: SpeciesPoint): void {
    this.isLoading = true;
    this.checkSpeciesUpdate(species);
    this.speciesService.getSpeciesDetail(species.id).subscribe({
      next: (detail) => {
        this.selectedSpecies = detail;
        console.log("Taxon_ID:", detail.taxon_id);
      },
      error: (err) => {
        console.error('Error al obtener el detalle de la especie:', err);
        this.isLoading = false;
      }
    });
    
    this.flyToMarker(species);
  }
  
  // Metodo para cerrar el panel lateral
  public closePanel(): void {
    this.clearCurrentSelection();
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
                country: loc.country,
                updatedAt: species.updatedAt,
                taxon_id: species.taxon_id,
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
      'CR': '#ffffff',
      'EW': '#ff0000',
      'EX': '#000000'
    };
    return colors[category] || '#ffffff';
  }
  
  //Funcion para navegar y hacer zoom en un marcado, especie o cluster.
  private flyToMarker(marker: SpeciesPoint | ClusterPoint): void {
    if (this.globeInstance && marker) {
      let altitude: number;
      if ('count' in marker) {
        const minSize = 30;
        const maxSize = 150;
        const minAltitude = 0.2;
        const maxAltitude = 1.5;
        const markerSize = marker.size || minSize;
        altitude = minAltitude + (maxAltitude - minAltitude) * ((markerSize - minSize) / (maxSize - minSize)); //Altitud basada en tamaño del pais
      } else {
        altitude = 0.8;
      }
      this.globeInstance.pointOfView(
        { lat: marker.lat, lng: marker.lng, altitude: altitude },
        2000
      );
    }
  }
  
  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(term => term.length >= this.minSearchLength),
      switchMap(term => {
        this.searchLoading = true;
        return this.speciesService.searchSpecies(term).pipe(
          finalize(() => this.searchLoading = false),
          catchError(() => of([]))
        );
      })
    ).subscribe(species => this.filteredSpecies = species);
  }
  
  clearCurrentSelection(): void {
    this.selectedSpecies = null;
    this.currentImageIndex = 0;
    this.expandedClusterId = null;
    this.expandedSpeciesMarkers = [];
    this.selectedCluster = null;
    this.updateGlobeMarkers();
  }
  
  onSearchInput(term: string): void {
    // Filtrado de clusters
    this.filteredClusters = term.length >= this.minSearchLength 
    ? this.clusterPoints.filter(cluster => 
      cluster.name.toLowerCase().includes(term.toLowerCase()) ||
      cluster.country.toLowerCase().includes(term.toLowerCase())
    )
    : [];
    
    if (term.length >= this.minSearchLength) {
      this.searchSubject.next(term);
    } else {
      this.filteredSpecies = [];
    }
  }
  
  public selectSpeciesFromSearch(species: SpeciesPoint): void {
    const cluster = this.clusterPoints.find(c => 
      c.country.toUpperCase() === species.country?.toUpperCase()
    );
    if (cluster) {
      this.onClusterClick(cluster);
      setTimeout(() => {
        this.selectSpecies(species);
      }, 1000);
    } else {
      this.selectSpecies(species);
    }
  }
  
  isCluster(result: ClusterPoint | SpeciesPoint): result is ClusterPoint {
    return 'count' in result;
  }
  
  isSpecies(result: ClusterPoint | SpeciesPoint): result is SpeciesPoint {
    return 'common_name' in result;
  }
  
  nextImage(): void {
    if (this.selectedSpecies?.media && this.currentImageIndex < this.selectedSpecies.media.length - 1) {
      this.currentImageIndex++;
    }
  }
  
  prevImage(): void {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    }
  }
  
  get currentImage(): any {
    return this.selectedSpecies?.media?.[this.currentImageIndex];
  }
  
  toggleImageInfo(): void {
    this.showImageInfo = !this.showImageInfo;
  }
}