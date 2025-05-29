import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

class AuthServiceStub {
  authenticated = false;
  isAuthenticated() { return this.authenticated; }
  logout() { this.authenticated = false; }
}

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let authService: AuthServiceStub;
  let router: Router;

  beforeEach(async () => {
    authService = new AuthServiceStub();

    await TestBed.configureTestingModule({
      imports: [NavbarComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authService }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show Login link when not authenticated', () => {
    authService.authenticated = false;
    fixture.detectChanges();
    const loginLink = fixture.debugElement.query(By.css('a[routerLink="/auth/login"]'));
    expect(loginLink).toBeTruthy();
    const profileLink = fixture.debugElement.query(By.css('a[routerLink="/profile"]'));
    expect(profileLink).toBeNull();
  });

  it('should show Profile and Logout when authenticated', () => {
    authService.authenticated = true;
    fixture.detectChanges();
    const profileLink = fixture.debugElement.query(By.css('a[routerLink="/profile"]'));
    expect(profileLink).toBeTruthy();
    const logoutLink = fixture.debugElement.query(By.css('.logout'));
    expect(logoutLink).toBeTruthy();
    const loginLink = fixture.debugElement.query(By.css('a[routerLink="/auth/login"]'));
    expect(loginLink).toBeNull();
  });

});
