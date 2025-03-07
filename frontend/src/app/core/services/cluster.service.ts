import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Define la interfaz del Cluster (según lo que devuelve el backend)
export interface Cluster {
  _id: string;
  country: string;
  countryName: string;
  count: number;
  lat: number;
  lng: number;
  worstCategory: string;
}

export interface ClusterPoint {
  id: string;
  lat: number;
  lng: number;
  name: string;         // Por ejemplo, el nombre del país
  category: string;     // La categoría de peor estado (worstCategory)
  size: number;
  color: string;
  country: string;
  count: number;        // Cantidad de especies en ese país
}

@Injectable({
  providedIn: 'root'
})
export class ClusterService {

  private apiUrl = '/api/clusters';

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todos los clusters.
   */
  getClusters(): Observable<Cluster[]> {
    return this.http.get<Cluster[]>(this.apiUrl);
  }

  /**
   * Actualiza (o crea) el cluster a partir de los datos de una especie.
   * Se espera que el backend procese la información para actualizar el cluster correspondiente.
   * 
   * @param speciesData - Los datos de la especie (incluyendo las ubicaciones y categoría).
   */
  updateCluster(speciesData: any): Observable<any> {
    return this.http.post(this.apiUrl, speciesData);
  }
}