import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MapComponent } from './map.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subject, of } from 'rxjs';

const authServiceStub = { isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false) };
const speciesServiceStub = {
  getSpeciesByCountry: jasmine.createSpy('getSpeciesByCountry').and.returnValue(of([])),
  getSpeciesById: jasmine.createSpy('getSpeciesById').and.returnValue(of({ locations: [], _id: '1' })),
  searchSpecies: jasmine.createSpy('searchSpecies').and.returnValue(of([])),
  updateSpeciesStatusFromAPI: jasmine.createSpy('updateSpeciesStatusFromAPI').and.returnValue(of({}))
};
const clusterServiceStub = {
  getClusters: jasmine.createSpy('getClusters').and.returnValue(of([])),
  updateClusterStatusFromAPI: jasmine.createSpy('updateClusterStatusFromAPI').and.returnValue(of({ cluster: {} }))
};
const reportServiceStub = {
  triggerReport: jasmine.createSpy('triggerReport')
};
const favoriteServiceStub = {
  getFavorites: jasmine.createSpy('getFavorites').and.returnValue(of([])),
  addFavorite: jasmine.createSpy('addFavorite').and.returnValue(of({})),
  removeFavorite: jasmine.createSpy('removeFavorite').and.returnValue(of({}))
};
const missionServiceStub = {
  getDailyMissions: jasmine.createSpy('getDailyMissions').and.returnValue(of([]))
};
const missionEventServiceStub = {
  emit: jasmine.createSpy('emit')
};
const missionEngineServiceStub = {
  missions$: new Subject<any[]>()
};

class SpinnerServiceStub {
  show = jasmine.createSpy('show');
  hide = jasmine.createSpy('hide');
  getSpinner() { return of(null); }
}

describe('MapComponent', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;
  let spinner: SpinnerServiceStub;

  beforeEach(async () => {
    spinner = new SpinnerServiceStub();

    await TestBed.configureTestingModule({
      imports: [
        MapComponent,
        CommonModule,
        FormsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: NgxSpinnerService, useValue: spinner },
        { provide: 'AuthService', useValue: authServiceStub },
        { provide: 'SpeciesService', useValue: speciesServiceStub },
        { provide: 'ClusterService', useValue: clusterServiceStub },
        { provide: 'ReportService', useValue: reportServiceStub },
        { provide: 'FavoriteService', useValue: favoriteServiceStub },
        { provide: 'MissionService', useValue: missionServiceStub },
        { provide: 'MissionEventService', useValue: missionEventServiceStub },
        { provide: 'MissionEngineService', useValue: missionEngineServiceStub },
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the MapComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should set isUser to false when not authenticated', () => {
    authServiceStub.isAuthenticated.and.returnValue(false);
    component.ngOnInit();
    expect(component.isUser).toBeFalse();
  });

  it('should show spinner and call init methods on AfterViewInit', fakeAsync(() => {
    const initSpy = spyOn<any>(component, 'initializeGlobe').and.callFake(() => {});
    const cloudSpy = spyOn<any>(component, 'addClouds').and.callFake(() => {});
    const clusterSpy = spyOn<any>(component, 'loadAllClusters').and.callFake(() => {});

    component.ngAfterViewInit();
    expect(spinner.show).toHaveBeenCalled();

    expect(initSpy).toHaveBeenCalled();
    expect(cloudSpy).toHaveBeenCalled();
    expect(clusterSpy).toHaveBeenCalled();

    tick(1500);
    expect(component.isLoading).toBeFalse();
    expect(spinner.hide).toHaveBeenCalled();
  }));
});
