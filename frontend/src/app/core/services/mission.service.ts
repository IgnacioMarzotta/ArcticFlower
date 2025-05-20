import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Mission } from '../models/mission.models';

@Injectable({ providedIn: 'root' })
export class MissionService {
  private apiUrl = '/api/missions';
  
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
  
  completeMission(id: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/${id}/complete`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }
  
  claimMission(id: string): Observable<{ rewardXP: number }> {
    return this.http.post<{ rewardXP: number }>(
      `${this.apiUrl}/${id}/claim`,
      {},
      { headers: this.getAuthHeaders() }
    );
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