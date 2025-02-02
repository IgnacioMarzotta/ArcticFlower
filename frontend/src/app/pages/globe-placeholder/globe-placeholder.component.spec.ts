import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobePlaceholderComponent } from './globe-placeholder.component';

describe('GlobePlaceholderComponent', () => {
  let component: GlobePlaceholderComponent;
  let fixture: ComponentFixture<GlobePlaceholderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GlobePlaceholderComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GlobePlaceholderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
