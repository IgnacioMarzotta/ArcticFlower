import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

export function configureTestModule(config: {
  declarations?: any[];
  imports?: any[];
  providers?: any[];
}) {
  TestBed.configureTestingModule({
    imports: [
      HttpClientTestingModule,
      ...(config.imports || [])
    ],
    declarations: [
      ...(config.declarations || [])
    ],
    providers: [
      ...(config.providers || [])
    ]
  }).compileComponents();
}

export function createComponent<T>(component: new (...args: any[]) => T):
  { fixture: ComponentFixture<T>, instance: T } {
  const fixture = TestBed.createComponent(component);
  const instance = fixture.componentInstance;
  fixture.detectChanges();
  return { fixture, instance };
}