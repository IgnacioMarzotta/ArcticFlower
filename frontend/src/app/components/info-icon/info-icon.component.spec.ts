import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { of, Subject, throwError } from 'rxjs';
import { InfoIconComponent } from './info-icon.component';
import { ReportService } from 'src/app/core/services/report.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

class ReportServiceStub {
  openReport$ = new Subject<string | null>();
  create = jasmine.createSpy('create');
}

describe('InfoIconComponent', () => {
  let fixture: ComponentFixture<InfoIconComponent>;
  let component: InfoIconComponent;
  let reportSvc: ReportServiceStub;

  beforeEach(async () => {
    reportSvc = new ReportServiceStub();

    await TestBed.configureTestingModule({
      imports: [
        InfoIconComponent,
        CommonModule,
        FormsModule
      ],
      providers: [
        { provide: ReportService, useValue: reportSvc }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InfoIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle modal visibility when icon clicked', () => {
    const icon = fixture.debugElement.query(By.css('.info-icon'));
    expect(component.showModal).toBeFalse();

    icon.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(component.showModal).toBeTrue();

    icon.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(component.showModal).toBeFalse();
  });

  it('should open modal when openReport$ emits', () => {
    expect(component.showModal).toBeFalse();
    reportSvc.openReport$.next('species123');
    fixture.detectChanges();
    expect(component.showModal).toBeTrue();
    expect(component.speciesId).toBe('species123');
  });

  it('should not submit if message is empty', () => {
    component.message = '   ';
    component.toggleModal();
    component.submitting = false;

    component.submitReport();
    expect(reportSvc.create).not.toHaveBeenCalled();
  });

  it('should call reportService.create and show success on submit', fakeAsync(() => {
    component.showModal = true;
    component.type = 'bug';
    component.message = 'Test error';
    reportSvc.create.and.returnValue(of(null));
    spyOn(Swal, 'fire');

    component.submitReport();
    tick();
    fixture.detectChanges();

    expect(reportSvc.create).toHaveBeenCalledWith({
      message: 'Test error',
      type: 'bug',
      species: undefined
    });
    expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
      icon: 'success',
      title: 'Report sent!'
    }));
    flush();
  }));

  it('should show error on submit failure', fakeAsync(() => {
    component.showModal = true;
    component.message = 'Error case';
    reportSvc.create.and.returnValue(throwError(() => new Error('fail')));
    spyOn(Swal, 'fire');

    component.submitReport();
    tick();

    expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
      icon: 'error',
      title: 'Error'
    }));
    flush();
  }));
});
