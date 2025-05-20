import { debounceTime, distinctUntilChanged, switchMap, finalize, catchError, filter } from 'rxjs/operators';
import { Component, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxSpinnerComponent, NgxSpinnerService } from 'ngx-spinner';
import { FormsModule } from '@angular/forms';
import { Subject, of, forkJoin } from 'rxjs';
import * as GLOBE from 'globe.gl';
import * as THREE from 'three';
import countries from 'world-countries';
import 'flag-icons/css/flag-icons.min.css';
import Swal from 'sweetalert2';

import { SpeciesPoint, ClusterPoint } from '../../core/models/map.models';
import { Favorite } from '../../core/models/favorite.model';
import { Mission } from '../../core/models/mission.models';

import { SpeciesService } from '../../core/services/species.service';
import { ClusterService } from '../../core/services/cluster.service';
import { ReportService } from 'src/app/core/services/report.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { MissionService } from '../../core/services/mission.service';
import { MissionEventService } from '../../core/services/mission-event.service';
import { MissionEngineService } from 'src/app/core/services/mission-engine.service';

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
  isImageLoading: boolean = true;
  
  //Favorites system
  public isFavorited = false;
  public showFavoritesPanel = false;
  public favoriteList: Favorite[] = [];
  private favoriteIds = new Set<string>();
  private favoriteClusters = new Map<string, string>();

  //Missions system
  missions: Mission[] = [];
  public showMissionsPanel = false;
  prev: Record<string, boolean> = {};
  public Toast = Swal.mixin({ 
    toast: true,
    position: 'top',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });
  
  constructor(
    private speciesService: SpeciesService,
    private cdr: ChangeDetectorRef,
    private spinner: NgxSpinnerService,
    private clusterService: ClusterService,
    private reportService: ReportService,
    private favoriteService: FavoriteService,
    private missionService: MissionService,
    private missionEvents: MissionEventService,
    private missionEngine: MissionEngineService,
  ) {}
  
  ngOnInit(): void {
    this.setupSearch();
    this.initializeFavorites();
    this.loadDailyMissions();
    this.listenForMissionUpdates();
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
    
    this.favoriteService.getFavorites().subscribe(favs => {
      this.favoriteIds = new Set(
        favs.map(f => typeof f.speciesId === 'string'
          ? f.speciesId
          : (f.speciesId as any)._id
        )
      );
    });
  }

  //Funcion principal para inicializar el globo, que se encarga de crear el globo y asignar los datos de los paises y marcadores.
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
        
        markerDiv.onclick = () => this.selectCluster(d as ClusterPoint);
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
  
  //Funcion para verificar si el cluster ha sido actualizado en el plazo establecido, y si no lo ha sido, se llama a la API para actualizarlo.
  checkClusterUpdate(cluster: ClusterPoint): void {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - this.daysToCheck);
    if (new Date(cluster.updatedAt) < oneWeekAgo) {
      console.log("El cluster no ha sido actualizado en el plazo establecido. Se realizará una llamada a la API para actualizar datos.");
      this.clusterService.updateClusterStatusFromAPI(cluster).subscribe({
        next: resp => {
          console.log("Cluster actualizado:", resp.cluster);
          cluster.updatedAt = new Date().toISOString(); //Se actualiza el cluster con la fecha actual unicamente en el front-end, para evitar que las actualizaciones se disparen mas de 1 vez.
          const idx = this.clusterPoints.findIndex(c => c.id === cluster.id);
          if (idx !== -1) {
            this.clusterPoints[idx].updatedAt = cluster.updatedAt;
          }
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
  
  //Funcion para verificar si la especie ha sido actualizada en el plazo establecido, y si no lo ha sido, se llama a la API para actualizarla.
  checkSpeciesUpdate(species: SpeciesPoint): void {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - this.daysToCheck);
    if (new Date(species.updatedAt) < oneWeekAgo) {
      //Actualizar
      console.log("La especie no ha sido actualizada en el plazo establecido. Se realizará una llamada a la API para actualizar datos.");
      this.speciesService.updateSpeciesStatusFromAPI(species).subscribe({
        next: resp => {
          species.updatedAt = new Date().toISOString(); //Se actualiza la especie con la fecha actual unicamente en el front-end, para evitar que las actualizaciones se disparen mas de 1 vez.
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
  
  //Funcion para cargar las especies dentro de un cluster, que se encarga de obtener las especies desde la API y asignarlas a la variable expandedSpeciesMarkers.
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
  
  //Funcion para actualizar los marcadores del globo, dependiendo de si el cluster esta expandido o no.
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
  
  //Funcion principal para cargar todos los clusters, que se encarga de obtener los clusters desde la API y asignarlos a la variable clusterPoints.
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
  
  //Funcion principal para seleccionar una especie, que se encarga de cargar los detalles de la especie y navegar hacia el marcador correspondiente.
  public selectSpecies(species: SpeciesPoint): void {
    this.isLoading = true;
    this.checkSpeciesUpdate(species);
    
    this.speciesService.getSpeciesDetail(species.id).subscribe({
      next: detail => {
        detail.id = detail._id;
        this.selectedSpecies = detail;
        this.isFavorited = this.favoriteIds.has(species.id);
        this.isLoading = false;
        const matchingLoc = detail.locations.find((loc: any) =>
          loc.country.toUpperCase() === this.selectedCluster?.country.toUpperCase()
        ) || detail.locations[0];
        const { lat, lng } = matchingLoc;

        console.log("Emitiendo evento de especie.", lat, " " , lng);
        this.missionEvents.emit({
          type: 'SPECIES_VIEW',
          payload: {
            clusterId: species.country,
            status: detail.category,
            speciesId: detail._id,
            lat,
            lng
          }
        });
        console.log("Evento emitido.", lat, lng);
      },
      error: err => {
        console.error('Error al obtener el detalle de la especie:', err);
        this.isLoading = false;
      }
    });
  }
  
  //Funcion principal para seleccionar un cluster, que se encarga de cargar los detalles del cluster y navegar hacia el marcador correspondiente.
  selectCluster(cluster: ClusterPoint): void {
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
  
  //Funcion para limpiar la seleccion actual, que se encarga de reiniciar las variables de seleccion y actualizar los marcadores del globo.
  clearCurrentSelection(): void {
    this.selectedSpecies = null;
    this.currentImageIndex = 0;
    this.expandedClusterId = null;
    this.expandedSpeciesMarkers = [];
    this.selectedCluster = null;
    this.updateGlobeMarkers();
  }
  
  //Funcion para abrir el modal de reporte enviando la id de la especie seleccionada para reportes mas detallados
  openSpeciesReport() {
    console.log("Abriendo modal de reportes para la especie:", this.selectedSpecies?.id);
    if (this.selectedSpecies?.id) {
      this.reportService.triggerReport(this.selectedSpecies.id);
    }
  }

  /* Search system */

  //Funcion para filtrar los clusters en base al texto ingresado por el usuario, que se encarga de filtrar los clusters y actualizar la lista de resultados.
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
  
  //Funcion para seleccionar una especie desde la busqueda, que se encarga de seleccionar el cluster correspondiente y luego la especie.
  public selectSpeciesFromSearch(species: SpeciesPoint): void {
    const cluster = this.clusterPoints.find(c => 
      c.country.toUpperCase() === species.country?.toUpperCase()
    );
    if (cluster) {
      this.selectCluster(cluster);
      setTimeout(() => {
        this.selectSpecies(species);
      }, 1000);
    } else {
      this.selectSpecies(species);
    }
  }

  //Funcion para inicializar el sistema de busqueda, que se encarga de filtrar las especies y clusters en base al texto ingresado por elusuario.
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
  
  /* Media system */

  //Funcion para mostrar la siguiente imagen en el carrusel
  nextImage(): void {
    if (this.selectedSpecies?.media && this.currentImageIndex < this.selectedSpecies.media.length - 1) {
      this.currentImageIndex++;
    }
  }
  
  //Funcion para mostrar la imagen anterior en el carrusel
  prevImage(): void {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    }
  }
  
  //Funcion para mostrar la imagen actual en el carrusel
  get currentImage(): any {
    return this.selectedSpecies?.media?.[this.currentImageIndex];
  }
  
  //Funcion para mostrar u ocultar la informacion de la imagen actual en el carrusel
  toggleImageInfo(): void {
    this.showImageInfo = !this.showImageInfo;
  }
  
  /* Favorites */

  //Inicializa el sistema de favoritos, cargando los favoritos del usuario y asignando los ids de especies y clusters a los favoritos.
  private initializeFavorites() {
    this.favoriteService.getFavorites()
      .pipe(catchError(() => of([])))
      .subscribe((favs: Favorite[]) => {
        this.favoriteList = favs.map(f => ({
          ...f,
          speciesId: { ...(f.speciesId as any), id: (f.speciesId as any)._id },
          clusterId: { ...(f.clusterId as any), id: (f.clusterId as any)._id }
        }));
        this.favoriteIds = new Set(this.favoriteList.map(f => f.speciesId.id));
        this.favoriteClusters.clear();
        this.favoriteList.forEach(f =>
          this.favoriteClusters.set(f.speciesId.id, f.clusterId.id!)
        );
      });
  }

  //Verifica si la especie y el cluster son favoritos, y si lo son, los elimina de la lista de favoritos. De lo contrario, los agrega a la lista de favoritos.
  public toggleFavorite(): void {
    if (!this.selectedSpecies || !this.selectedCluster) return;
    const sid = this.selectedSpecies.id, cid = this.selectedCluster.id;
  
    if (this.isFavorited) {
      this.favoriteService.removeFavorite(sid, cid).subscribe(() => {
        this.favoriteIds.delete(sid);
        this.isFavorited = false;
        this.favoriteList = this.favoriteList.filter(f =>
          !(f.speciesId.id === sid && f.clusterId.id === cid)
        );
        this.favoriteClusters.delete(sid);
        this.Toast.fire({
          icon: 'info',
          title: 'Removed from favorites :('
        });
      });
    } else {
      this.favoriteService.addFavorite(sid, cid).subscribe(fav => {
        const normalized: Favorite = {
          ...fav,
          speciesId: { ...(fav.speciesId as any), id: (fav.speciesId as any)._id },
          clusterId: { ...(fav.clusterId as any), id: (fav.clusterId as any)._id },
          userId: fav.userId,
          dateAdded: fav.dateAdded,
          _id: fav._id
        };
  
        this.isFavorited = true;
        this.favoriteIds.add(sid);
        this.favoriteList.push(normalized);
        this.favoriteClusters.set(sid, cid);

        this.Toast.fire({
          icon: 'info',
          title: 'Species added to favorites!'
        });
      });
    }
  }
  
  //Muestra u oculta el panel de favoritos.
  public toggleFavoritesPanel(): void {
    if (!this.showFavoritesPanel && this.showMissionsPanel) {
      this.showMissionsPanel = false;
    }
    this.showFavoritesPanel = !this.showFavoritesPanel;
  }
  
  //Selecciona, carga y navega hacia un favorito.
  public goToFavorite(fav: Favorite): void {
    const cid = fav.clusterId.id!;
    const cluster = this.clusterPoints.find(c => c.id === cid);
    if (cluster) {
      this.selectCluster(cluster);
      setTimeout(() => this.selectSpecies(fav.speciesId), 1000);
    }
    this.showFavoritesPanel = false;
  }

  /* Missions */

  //Muestra u oculta el panel de misiones, cerrando el panel de favoritos en caso de estar abierto
  public toggleMissionsPanel(): void {
    if (!this.showMissionsPanel && this.showFavoritesPanel) {
      this.showFavoritesPanel = false;
    }
    this.showMissionsPanel = !this.showMissionsPanel;
  }

  //Suscripcion a cambio de misiones y lanzamiento de toasts en caso de que se complete la mision
  private listenForMissionUpdates(): void {
    this.missionEngine.missions$.subscribe(miss => {
      miss.forEach(m => {
        if (this.prev.hasOwnProperty(m._id) && this.prev[m._id] === false && m.completed) {
          this.Toast.fire({
            icon: 'success',
            title: 'Mission completed!'
          });
        }
        this.prev[m._id] = m.completed;
      });
      this.missions = miss;
      this.cdr.detectChanges();
    });
  }

  //Funcion encargada de la carga de misiones del dia
  private loadDailyMissions(): void {
    this.missionService.getDailyMissions().subscribe({
      next: data => {
        this.missions = data;
        data.forEach(m => this.prev[m._id] = m.completed);
      },
      error: err => console.error('No se pudieron cargar misiones', err)
    });
  }
}