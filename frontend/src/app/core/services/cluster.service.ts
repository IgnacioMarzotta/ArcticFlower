import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClusterPoint } from '../models/map.models';
// Define la interfaz del Cluster (segun lo que devuelve el backend)

@Injectable({
  providedIn: 'root'
})
export class ClusterService {

  private apiUrl = '/api/clusters';

  constructor(private http: HttpClient) { }

  getClusters(): Observable<ClusterPoint[]> {
    return this.http.get<ClusterPoint[]>(this.apiUrl);
  }

  updateCluster(speciesData: any): Observable<any> {
    return this.http.post(this.apiUrl, speciesData);
  }

  updateClusterStatusFromAPI(countryCode: string) {
    return this.http.get<any>(`${this.apiUrl}/${countryCode}/gbif`);
  }
}