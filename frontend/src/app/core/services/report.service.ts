import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Report, PaginatedReportsResponse } from '../models/report.model';
import { Observable, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private apiUrl = `${environment.apiUrl}/reports`;
  
  private openReportSource = new Subject<string|undefined>();
  openReport$ = this.openReportSource.asObservable();
  
  constructor(
    private http: HttpClient,
    private authService: AuthService 
  ) {}
  
  create(report: Partial<Report>): Observable<Report> {
    const token = this.authService.getAccessToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post<Report>(this.apiUrl, report, { headers });
  }
  
  getUserReports(): Observable<Report[]> {
    const token = this.authService.getAccessToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get<Report[]>(`${this.apiUrl}/user`, { headers });
  }
  
  getAll(page: number, limit: number, resolvedStatus: string): Observable<PaginatedReportsResponse> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    if (resolvedStatus && resolvedStatus !== 'all') {
      params = params.set('resolved', resolvedStatus);
    }
    return this.http.get<PaginatedReportsResponse>(this.apiUrl, { params });
  }
  
  triggerReport(speciesId?: string) {
    this.openReportSource.next(speciesId);
  }
  
  updateStatus(id: string, resolved: boolean): Observable<Report> {
    const updateUrl = `${this.apiUrl}/${id}/status`;
    const body = { resolved };
    return this.http.patch<Report>(updateUrl, body);
  }
  
  delete(id: string): Observable<any> {
    const deleteUrl = `${this.apiUrl}/${id}`;
    return this.http.delete(deleteUrl);
  }
}