import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { tap, catchError, switchMap, filter, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { LoginApiResponse, ProfileResponse } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject: BehaviorSubject<any | null>;
  public currentUser: Observable<any | null>;
  
  private isRefreshingToken = false;
  private tokenRefreshed$ = new BehaviorSubject<boolean | null>(null);
  
  
  constructor(private http: HttpClient, private router: Router) {
    const token = this.getAccessToken();
    this.currentUserSubject = new BehaviorSubject<any | null>(token ? { tokenExists: true } : null);
    this.currentUser = this.currentUserSubject.asObservable();
  }
  
  public get currentUserValue(): any | null {
    return this.currentUserSubject.value;
  }
  
  register(userData: { username: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }
  
  login(credentials: { email: string; password: string }): Observable<LoginApiResponse> {
    return this.http.post<LoginApiResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response.accessToken && response.user) {
          localStorage.setItem('auth_token', response.accessToken);
          this.currentUserSubject.next(response.user);
        } else {
          console.error('Login response missing accessToken or user data.');
          this.logoutUserAndRedirect();
        }
      }),
      catchError(error => {
        this.currentUserSubject.next(null);
        return throwError(() => error);
      })
    );
  }
  
  logout(): Observable<any> {
    const obs = this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true });
    this.logoutUserAndRedirect();
    return obs;
  }
  
  public logoutUserAndRedirect(navigateToLogin: boolean = true): void {
    localStorage.removeItem('auth_token');
    this.currentUserSubject.next(null);
    if (navigateToLogin) {
      this.router.navigate(['/auth/login']);
    }
  }
  
  getProfile(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${this.apiUrl}/profile`).pipe(
      tap(profile => {
        const existingUser = this.currentUserSubject.value || {};
        const userId = existingUser.id || (this.currentUserSubject.value?.user?.id); 
        this.currentUserSubject.next({ ...existingUser, ...profile, id: userId });
      })
    );
  }
  
  getAccessToken(): string | null {
    return localStorage.getItem('auth_token');
  }
  
  attemptRefreshToken(): Observable<string> {
    if (this.isRefreshingToken) {
      return this.tokenRefreshed$.pipe(
        filter(result => result !== null),
        take(1),
        switchMap(result => {
          const newAccessToken = this.getAccessToken();
          if (newAccessToken && result === true) {
            return of(newAccessToken);
          } else {
            return throwError(() => new Error('Failed to get new token after refresh'));
          }
        })
      );
    }
    
    this.isRefreshingToken = true;
    this.tokenRefreshed$.next(null);
    
    return this.http.post<{ accessToken: string }>(`${this.apiUrl}/refresh`,{},{ withCredentials: true }).pipe(
      tap(response => {
        if (!(response && response.accessToken)) {
          throw new Error('No access token received from refresh');
        }
        localStorage.setItem('auth_token', response.accessToken);
      }),
      switchMap(response => {
        this.isRefreshingToken = false;
        this.tokenRefreshed$.next(true);
        return of(response.accessToken);
      }),
      catchError(error => {
        this.isRefreshingToken = false;
        this.tokenRefreshed$.next(false);
        this.logoutUserAndRedirect();
        
        let errorMessage = 'Refresh token failed or endpoint error';
        if (error && error.message && error.message.includes('No access token received from refresh')) {
          errorMessage = error.message;
        } else if (error instanceof Response && error.status === 0) {
          errorMessage = 'Network error during token refresh.';
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }
  
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  checkUsernameAvailability(username: string): Observable<{ isTaken: boolean }> {
    return this.http.get<{ isTaken: boolean }>(`${this.apiUrl}/check-username/${username}`);
  }

  checkEmailAvailability(email: string): Observable<{ isTaken: boolean }> {
    return this.http.get<{ isTaken: boolean }>(`${this.apiUrl}/check-email/${email}`);
  }
}