import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Favorite } from '../models/favorite.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
    private apiUrl = `${environment.apiUrl}/favorites`;
    
    constructor(private http: HttpClient) {}
    
    private authHeaders() {
        const token = localStorage.getItem('auth_token');
        return new HttpHeaders({ Authorization: `Bearer ${token}` });
    }
    
    getFavorites(): Observable<Favorite[]> {
        return this.http.get<Favorite[]>(this.apiUrl, { headers: this.authHeaders() });
    }
    
    addFavorite(speciesId: string, clusterId: string): Observable<Favorite> {
        return this.http.post<Favorite>(
            this.apiUrl,
            { speciesId, clusterId },
            { headers: this.authHeaders() }
        );
    }
    
    removeFavorite(speciesId: string, clusterId: string): Observable<void> {
        return this.http.delete<void>(
            this.apiUrl,
            {
                headers: this.authHeaders(),
                body: { speciesId, clusterId }
            }
        );
    }
}