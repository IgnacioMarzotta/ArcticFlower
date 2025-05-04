import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Report } from '../models/report.model';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private apiUrl = '/api/reports';

  private openReportSource = new Subject<string|undefined>();
  openReport$ = this.openReportSource.asObservable();

  constructor(private http: HttpClient) {}

  create(report: Partial<Report>): Observable<Report> {
    return this.http.post<Report>(this.apiUrl, report);
  }

  getAll(): Observable<Report[]> {
    return this.http.get<Report[]>(this.apiUrl);
  }

  triggerReport(speciesId?: string) {
    this.openReportSource.next(speciesId);
  }
}