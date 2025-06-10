import { SpeciesPoint, AllSpeciesResponse } from '../models/map.models';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SpeciesService {
  private apiUrl = `${environment.apiUrl}/species`;
  
  constructor(private http: HttpClient) { }
  
  getAllSpecies(params: { page: number, limit: number, search?: string, category?: string }): Observable<AllSpeciesResponse> {
    let httpParams = new HttpParams().set('page', params.page.toString()).set('limit', params.limit.toString());
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.category && params.category !== 'all') {
      httpParams = httpParams.set('category', params.category);
    }
    return this.http.get<AllSpeciesResponse>(this.apiUrl, { params: httpParams });
  }
  
  getSpeciesById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }
  
  getSpeciesByCountry(country: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/country/${country}`);
  }
  
  // populateSpecies(speciesData: any): Observable<any> {
  //   return this.http.post(this.apiUrl, speciesData);
  // }
  
  updateSpeciesStatusFromAPI(species: any) {
    return this.http.post<any>(`${this.apiUrl}/update-status`, species);
  }
  
  searchSpecies(searchTerm: string, limit: number = 50): Observable<SpeciesPoint[]> {
    const params = new HttpParams().set('q', searchTerm).set('limit', limit.toString());
    return this.http.get<SpeciesPoint[]>(`${this.apiUrl}/search`, { params });
  }
  
  updateSpecies(id: string, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, data);
  }
  
  deleteSpecies(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
  
  createSpecies(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin-create`, data);
  }
  
}