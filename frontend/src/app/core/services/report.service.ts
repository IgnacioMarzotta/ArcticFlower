import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Report } from '../models/report.model';
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

  getAll(): Observable<Report[]> {
    return this.http.get<Report[]>(this.apiUrl);
  }

  triggerReport(speciesId?: string) {
    this.openReportSource.next(speciesId);
  }
}