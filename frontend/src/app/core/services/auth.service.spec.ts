import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface LoginApiResponse {
  accessToken: string;
  user: {
    id: string;
    username: string;
    email: string;
    permissions: number;
  };
}

interface ProfileResponse {
  username: string;
  email: string;
  created_at: string;
  permissions: number;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  
  let mockLocalStorageStore: { [key: string]: string | null };
  let getItemSpy: jasmine.Spy;
  let setItemSpy: jasmine.Spy;
  let removeItemSpy: jasmine.Spy;
  
  const mockApiUrl = `${environment.apiUrl}/auth`;
  
  const mockLoginResponse: LoginApiResponse = {
    accessToken: 'mock-access-token',
    user: { id: '1', username: 'testuser', email: 'test@example.com', permissions: 1 }
  };
  
  const mockProfileResponse: ProfileResponse = {
    username: 'testuser',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
    permissions: 1
  };
  
  beforeEach(() => {
    mockLocalStorageStore = {};
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    
    getItemSpy = spyOn(localStorage, 'getItem').and.callFake((key: string): string | null => {
      return mockLocalStorageStore[key] || null;
    });
    setItemSpy = spyOn(localStorage, 'setItem').and.callFake((key: string, value: string): void => {
      mockLocalStorageStore[key] = value;
    });
    removeItemSpy = spyOn(localStorage, 'removeItem').and.callFake((key: string): void => {
      delete mockLocalStorageStore[key];
    });
    
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy }
      ]
    });
    
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    
    service['isRefreshingToken'] = false;
    service['tokenRefreshed$'].next(null);
  });
  
  afterEach(() => {
    httpMock.verify();
  });
  
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  
  it('constructor should initialize currentUserSubject based on localStorage', () => {
    mockLocalStorageStore['auth_token'] = 'initial-token-for-constructor';
    const httpClient = TestBed.inject(HttpClient);
    const newServiceInstance = new AuthService(httpClient, routerSpy);
    expect(getItemSpy).toHaveBeenCalledWith('auth_token');
    expect(newServiceInstance.currentUserValue).toEqual({ tokenExists: true });
  });
  
  
  it('currentUserValue should return current value of currentUserSubject', () => {
    service['currentUserSubject'].next({ test: 'data' });
    expect(service.currentUserValue).toEqual({ test: 'data' });
  });
  
  describe('register', () => {
    it('should make a POST request to /register', () => {
      const userData = { username: 'newuser', email: 'new@example.com', password: 'password123' };
      const mockRegResponse = { message: 'User created' };
      service.register(userData).subscribe(response => {
        expect(response).toEqual(mockRegResponse);
      });
      const req = httpMock.expectOne(`${mockApiUrl}/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(userData);
      req.flush(mockRegResponse);
    });
  });
  
  describe('login', () => {
    it('should store token and user on successful login', () => {
      service.login({ email: 'test@example.com', password: 'password' }).subscribe(response => {
        expect(response).toEqual(mockLoginResponse);
      });
      const req = httpMock.expectOne(`${mockApiUrl}/login`);
      expect(req.request.method).toBe('POST');
      req.flush(mockLoginResponse);
      expect(setItemSpy).toHaveBeenCalledWith('auth_token', mockLoginResponse.accessToken);
      expect(service.currentUserValue).toEqual(mockLoginResponse.user);
    });
    
    it('should call logoutUserAndRedirect if login response is invalid (no accessToken)', () => {
      spyOn(service, 'logoutUserAndRedirect').and.callThrough();
      const invalidResponse = { user: mockLoginResponse.user } as any;
      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne(`${mockApiUrl}/login`);
      req.flush(invalidResponse);
      expect(service.logoutUserAndRedirect).toHaveBeenCalled();
      expect(setItemSpy).not.toHaveBeenCalledWith(jasmine.any(String), jasmine.any(String));
    });
    
    it('should call logoutUserAndRedirect if login response is invalid (no user)', () => {
      spyOn(service, 'logoutUserAndRedirect').and.callThrough();
      const invalidResponse = { accessToken: 'some-token' } as any;
      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne(`${mockApiUrl}/login`);
      req.flush(invalidResponse);
      expect(service.logoutUserAndRedirect).toHaveBeenCalled();
      expect(setItemSpy).not.toHaveBeenCalledWith(jasmine.any(String), jasmine.any(String));
    });
    
    it('should set currentUser to null on http error during login', () => {
      service.login({ email: 'test@example.com', password: 'password' }).subscribe({
        error: (err) => expect(err).toBeTruthy()
      });
      const req = httpMock.expectOne(`${mockApiUrl}/login`);
      req.flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });
      expect(service.currentUserValue).toBeNull();
    });
  });
  
  describe('logout', () => {
    it('should call /logout endpoint and always call logoutUserAndRedirect', () => {
      spyOn(service, 'logoutUserAndRedirect').and.callThrough();
      service.logout().subscribe();
      const req = httpMock.expectOne(`${mockApiUrl}/logout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBeTrue();
      req.flush({ message: 'Logged out' });
      expect(service.logoutUserAndRedirect).toHaveBeenCalled();
    });
  });
  
  describe('logoutUserAndRedirect', () => {
    it('should remove token, set currentUser to null, and navigate to login', () => {
      mockLocalStorageStore['auth_token'] = 'test-token';
      service['currentUserSubject'].next({ id: '1' });
      service.logoutUserAndRedirect();
      expect(removeItemSpy).toHaveBeenCalledWith('auth_token');
      expect(mockLocalStorageStore['auth_token']).toBeUndefined();
      expect(service.currentUserValue).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
    
    it('should not navigate if navigateToLogin is false', () => {
      service.logoutUserAndRedirect(false);
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });
  
  describe('getProfile', () => {
    it('should fetch user profile and update currentUser', () => {
      mockLocalStorageStore['auth_token'] = 'test-token';
      service['currentUserSubject'].next({ id: '1', tokenExists: true });
      service.getProfile().subscribe(profile => {
        expect(profile).toEqual(mockProfileResponse);
      });
      const req = httpMock.expectOne(`${mockApiUrl}/profile`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProfileResponse);
      const expectedUser = { id: '1', tokenExists: true, ...mockProfileResponse };
      expect(service.currentUserValue).toEqual(jasmine.objectContaining(expectedUser));
    });
  });
  
  describe('getAccessToken', () => {
    it('should return token from localStorage', () => {
      mockLocalStorageStore['auth_token'] = 'test-token';
      expect(service.getAccessToken()).toBe('test-token');
      expect(getItemSpy).toHaveBeenCalledWith('auth_token');
    });
    it('should return null if no token in localStorage', () => {
      expect(service.getAccessToken()).toBeNull();
      expect(getItemSpy).toHaveBeenCalledWith('auth_token');
    });
  });
  
  describe('isAuthenticated', () => {
    it('should return true if token exists', () => {
      mockLocalStorageStore['auth_token'] = 'test-token';
      expect(service.isAuthenticated()).toBeTrue();
    });
    it('should return false if no token exists', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });
  });
  
  describe('attemptRefreshToken', () => {
    const mockRefreshResponse = { accessToken: 'new-mock-access-token' };
    
    beforeEach(() => {
      service['isRefreshingToken'] = false;
      service['tokenRefreshed$'].next(null);
    });
    
    it('should handle error if queued refresh fails because original refresh failed', fakeAsync(() => {
      spyOn(service, 'logoutUserAndRedirect').and.callThrough();
      
      service.attemptRefreshToken().subscribe({
        next: () => fail('First refresh call should have failed'),
        error: (err) => {
          expect(err.message || err).toContain('Refresh token failed');
        }
      });
      const req1 = httpMock.expectOne(`${mockApiUrl}/refresh`);
      expect(service['isRefreshingToken']).withContext('isRefreshingToken should be true after first call').toBeTrue();
      
      let secondRefreshErrorCaught: any;
      service.attemptRefreshToken().subscribe({
        next: () => fail('Second (queued) refresh should have failed'),
        error: (err) => {
          secondRefreshErrorCaught = err;
        }
      });
      
      req1.flush({ message: 'Original refresh token invalid from server' }, { status: 403, statusText: 'Forbidden' });
      
      tick(); 
      
      expect(service['isRefreshingToken']).withContext('isRefreshingToken should be false after all operations').toBeFalse();
      expect(service.logoutUserAndRedirect).withContext('logoutUserAndRedirect should have been called once').toHaveBeenCalledTimes(1); 
      
      expect(secondRefreshErrorCaught).withContext('An error object was expected for the queued refresh call').toBeTruthy();
      if (secondRefreshErrorCaught) {
        expect(secondRefreshErrorCaught.message).withContext('Error message mismatch for queued call').toBe('Failed to get new token after refresh');
      }
    }));
    
    it('should call logoutUserAndRedirect if refresh fails (API error like 403)', fakeAsync(() => {
      spyOn(service, 'logoutUserAndRedirect').and.callThrough();
      let actualError: Error | undefined;
      
      service.attemptRefreshToken().subscribe({
        next: () => fail('Should have failed'),
        error: (err) => actualError = err
      });
      
      const req = httpMock.expectOne(`${mockApiUrl}/refresh`);
      req.flush({ message: 'Forbidden by server' }, { status: 403, statusText: 'Forbidden' });
      tick();
      
      expect(service.logoutUserAndRedirect).toHaveBeenCalled();
      expect(service['isRefreshingToken']).toBeFalse();
      expect(actualError).toBeTruthy();
      expect(actualError?.message).toBe('Refresh token failed or endpoint error');
    }));
    
    it('should call logoutUserAndRedirect if refresh response has no accessToken (custom error from tap)', fakeAsync(() => {
      spyOn(service, 'logoutUserAndRedirect').and.callThrough();
      let actualError: Error | undefined;
      
      service.attemptRefreshToken().subscribe({
        next: () => fail('Should have failed'),
        error: (err) => actualError = err
      });
      
      const req = httpMock.expectOne(`${mockApiUrl}/refresh`);
      req.flush({});
      tick();
      
      expect(service.logoutUserAndRedirect).toHaveBeenCalled();
      expect(service['isRefreshingToken']).toBeFalse();
      expect(actualError).toBeTruthy();
      expect(actualError?.message).toBe('No access token received from refresh');
    }));
    
    it('should handle error if queued refresh fails because original refresh failed', fakeAsync(() => {
      spyOn(service, 'logoutUserAndRedirect').and.callThrough();
      
      let firstCallError: Error | undefined;
      service.attemptRefreshToken().subscribe({ 
        next: () => fail('First refresh call should have failed'),
        error: (err) => firstCallError = err 
      });
      const req1 = httpMock.expectOne(`${mockApiUrl}/refresh`);
      expect(service['isRefreshingToken']).withContext('isRefreshingToken should be true after first call').toBeTrue();
      
      let secondRefreshErrorCaught: Error | undefined;
      service.attemptRefreshToken().subscribe({
        next: () => fail('Second (queued) refresh should have failed'),
        error: (err) => {
          secondRefreshErrorCaught = err;
        }
      });
      
      req1.flush({ message: 'Original refresh token invalid from server' }, { status: 403, statusText: 'Forbidden' });
      
      tick();
      
      expect(service['isRefreshingToken']).withContext('isRefreshingToken should be false after all operations').toBeFalse();
      expect(service.logoutUserAndRedirect).withContext('logoutUserAndRedirect should have been called once due to first refresh failure').toHaveBeenCalledTimes(1); 
      expect(firstCallError).toBeTruthy();
      expect(firstCallError?.message).toBe('Refresh token failed or endpoint error');
      expect(secondRefreshErrorCaught).withContext('An error object was expected for the queued refresh call').toBeTruthy();
      expect(secondRefreshErrorCaught?.message).withContext('Error message mismatch for queued call').toBe('Failed to get new token after refresh');
    }));
  });
  
});