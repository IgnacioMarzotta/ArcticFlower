import { ComponentFixture } from '@angular/core/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HomeComponent } from './home.component';
import { CommonModule } from '@angular/common';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { NgxTypedJsModule } from 'ngx-typed-js';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });

    await TestBed.configureTestingModule({
      imports: [
        HomeComponent,
        CommonModule,
        NgxChartsModule,
        NgxTypedJsModule,
        RouterTestingModule,
        NoopAnimationsModule
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the title container with ngx-typed-js', () => {
    const typed = fixture.debugElement.query(By.css('ngx-typed-js'));
    expect(typed).withContext('Debe renderizar ngx-typed-js en el título').toBeTruthy();
  });

  it('should calculate totalPages based on items and pageSize', () => {
    expect(component.pageSize).toBe(3);
    expect(component.totalPages).toBe(4);
  });

  it('should return first page items correctly', () => {
    const firstPage = component.pagedItems;
    expect(firstPage.length).toBe(3);
    expect(firstPage[0].img).toContain('gbif.png');
  });

  it('should paginate items correctly', fakeAsync(() => {
    component.currentPage = 1;
    fixture.detectChanges();
    let paged = component.pagedItems;
    expect(paged.length).toBe(component.pageSize);
    expect(paged[0]).toEqual(component.items[0]);

    component.currentPage = component.totalPages;
    fixture.detectChanges();
    paged = component.pagedItems;
    expect(paged.length).toBeGreaterThanOrEqual(1);
  }));

  it('should update pageSize on resize event', fakeAsync(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 500 });
    window.dispatchEvent(new Event('resize'));
    tick();

    component.onResize({ target: { innerWidth: 500 } });
    fixture.detectChanges();
    expect(component.pageSize).toBe(1);
  }));
});
