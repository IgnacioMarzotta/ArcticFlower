import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { tap } from 'rxjs/operators';

interface LoginResponse {
  token: string;
  permissions: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api/auth';
  private currentUserSubject = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient) {}

  register(userData: { username: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem('auth_token', response.token);
        this.currentUserSubject.next(response);
      })
    );
  }

  get currentUser(): Observable<any> {
    return this.currentUserSubject.asObservable();
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    this.currentUserSubject.next(null);
  }

  getProfile(): Observable<{ username: string; email: string; created_at: string }> {
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<{ username: string; email: string; created_at: string }>(
      `${this.apiUrl}/profile`,
      { headers }
    ).pipe(
      tap(profile => {
        this.currentUserSubject.next(profile);
      })
    );
  }

    getAccessToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  async refreshToken(): Promise<string> {

    const resp = await firstValueFrom(
      this.http.post<{ accessToken: string }>(
        '/api/auth/refresh',
        {},
        { withCredentials: true }
      )
    );

    if (!resp || !resp.accessToken) {
      throw new Error('No se obtuvo accessToken en el refresh');
    }

    localStorage.setItem('auth_token', resp.accessToken);
    return resp.accessToken;
  }
}