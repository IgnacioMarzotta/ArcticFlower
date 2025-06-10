import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClusterPoint } from '../models/map.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClusterService {

  private apiUrl = `${environment.apiUrl}/clusters`;

  constructor(private http: HttpClient) { }

  getClusters(): Observable<ClusterPoint[]> {
    return this.http.get<ClusterPoint[]>(this.apiUrl);
  }

  updateCluster(speciesData: any): Observable<any> {
    return this.http.post(this.apiUrl, speciesData);
  }

  updateClusterStatusFromAPI(cluster: ClusterPoint) {
    return this.http.post<any>(`${this.apiUrl}/gbif`, cluster);
  }
}