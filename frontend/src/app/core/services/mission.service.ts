import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Mission } from '../models/mission.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MissionService {
  private apiUrl = `${environment.apiUrl}/missions`;
  
  constructor(private http: HttpClient) {}
  
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }
  
  getDailyMissions(): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.apiUrl}/daily`, {
      headers: this.getAuthHeaders()
    });
  }
  
  handleEvent(id: string, event: any): Observable<{ completed: boolean; progress: { seen: string[] } }> {
    return this.http.post<{ completed: boolean; progress: { seen: string[] } }>(
      `${this.apiUrl}/${id}/event`,
      { event },
      { headers: this.getAuthHeaders() }
    );
  }
  
  checkMissionEvent(id: string, event: any): Observable<boolean> {
    return this.http.post<boolean>(
      `${this.apiUrl}/${id}/event`,
      { event },
      { headers: this.getAuthHeaders() }
    );
  }
  
}