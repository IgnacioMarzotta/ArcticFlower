import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface SpeciesResponse {
  species: any[];
  total: number;
  page: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class SpeciesService {
  private apiUrl = '/api/species';

  constructor(private http: HttpClient) { }

  createSpecies(speciesData: any): Observable<any> {
    return this.http.post(this.apiUrl, speciesData);
  }

  getAllSpecies(page: number = 1, limit: number = 1000): Observable<SpeciesResponse> {
    return this.http.get<SpeciesResponse>(
      `${this.apiUrl}?page=${page}&limit=${limit}`
    );
  }

  getSpeciesById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }
}