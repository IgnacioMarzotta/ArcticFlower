// frontend/src/app/app.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { InfoIconComponent } from './components/info-icon/info-icon.component';
import { RouterTestingModule } from '@angular/router/testing';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MissionEngineService } from './core/services/mission-engine.service';

class MissionEngineServiceStub {}

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        NavbarComponent,
        InfoIconComponent,
        RouterTestingModule,
        NgCircleProgressModule.forRoot({}),
        NoopAnimationsModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: MissionEngineService, useClass: MissionEngineServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should have title "frontend"', () => {
    expect(component.title).toBe('frontend');
  });

  it('should contain navbar and info-icon components', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-navbar')).toBeTruthy();
    expect(el.querySelector('app-info-icon')).toBeTruthy();
  });
});
