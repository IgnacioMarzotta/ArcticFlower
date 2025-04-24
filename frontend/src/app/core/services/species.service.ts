import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SpeciesPoint, AllSpeciesResponse } from '../models/map.models';

@Injectable({
  providedIn: 'root'
})
export class SpeciesService {
  private apiUrl = '/api/species';
  
  constructor(private http: HttpClient) { }

  getAllSpecies(page: number = 1, limit: number = 1000): Observable<AllSpeciesResponse> {
    return this.http.get<AllSpeciesResponse>(
      `${this.apiUrl}?page=${page}&limit=${limit}`
    );
  }
  
  getSpeciesDetail(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }
  
  getSpeciesById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }
  
  getSpeciesByCountry(country: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/country/${country}`);
  }
  
  populateSpecies(speciesData: any): Observable<any> {
    return this.http.post(this.apiUrl, speciesData);
  }

  updateSpeciesStatusFromAPI(species: any) {
    return this.http.post<any>(`${this.apiUrl}/update-status`, species);
  }

  searchSpecies(searchTerm: string, limit: number = 50): Observable<SpeciesPoint[]> {
    const params = new HttpParams()
    .set('q', searchTerm)
    .set('limit', limit.toString());
    return this.http.get<SpeciesPoint[]>(`${this.apiUrl}/search`, { params });
  }
}