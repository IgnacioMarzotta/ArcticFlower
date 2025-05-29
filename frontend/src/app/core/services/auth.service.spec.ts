import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('register should POST to /api/auth/register', () => {
    const userData = { username: 'u', email: 'e', password: 'p' };
    service.register(userData).subscribe();
    const req = httpMock.expectOne('/api/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(userData);
    req.flush({});
  });

  it('login should store token and emit currentUser', () => {
    const credentials = { email: 'e', password: 'p' };
    const mockResp = { token: 'abc', permissions: 1 };
    let currentUser: any;
    service.currentUser.subscribe(user => currentUser = user);

    service.login(credentials).subscribe(resp => {
      expect(resp).toEqual(mockResp);
      expect(localStorage.getItem('auth_token')).toBe('abc');
      expect(currentUser).toEqual(mockResp);
    });

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockResp);
  });

  it('isAuthenticated returns true when token exists', () => {
    localStorage.setItem('auth_token', 'tok');
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('isAuthenticated returns false when no token', () => {
    localStorage.removeItem('auth_token');
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('logout should clear token and currentUser', () => {
    localStorage.setItem('auth_token', 'tok');
    let currentUser: any = null;
    service.currentUser.subscribe(user => currentUser = user);
    service.logout();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(currentUser).toBeNull();
  });

  it('getProfile should GET with auth header and set currentUser', () => {
    localStorage.setItem('auth_token', 'tok');
    const profile = { username: 'u', email: 'e', created_at: '2025-05-01T00:00:00Z' };
    let currentUser: any;
    service.currentUser.subscribe(user => currentUser = user);

    service.getProfile().subscribe(data => expect(data).toEqual(profile));
    const req = httpMock.expectOne(req => req.method === 'GET' && req.url === '/api/auth/profile');
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok');
    req.flush(profile);
    expect(currentUser).toEqual(profile);
  });

  it('getAccessToken should return stored token', () => {
    localStorage.setItem('auth_token', 'tok');
    expect(service.getAccessToken()).toBe('tok');
  });

  it('refreshToken should POST and update token', fakeAsync(() => {
    service.refreshToken().then(token => {
      expect(token).toBe('newTok');
      expect(localStorage.getItem('auth_token')).toBe('newTok');
    });

    const req = httpMock.expectOne('/api/auth/refresh');
    expect(req.request.method).toBe('POST');
    req.flush({ accessToken: 'newTok' });
    tick();
  }));

  it('refreshToken should throw error if missing accessToken', fakeAsync(() => {
    let error: any;
    service.refreshToken().catch(err => error = err);
    const req = httpMock.expectOne('/api/auth/refresh');
    req.flush({}, { status: 200, statusText: 'OK' });
    tick();
    expect(error).toBeTruthy();
  }));
});
