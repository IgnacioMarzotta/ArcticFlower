import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

export interface PaginatedUsersResponse {
    users: User[];
    totalPages: number;
    currentPage: number;
}

@Injectable({
    providedIn: 'root'
})

export class UserService {
    private apiUrl = `${environment.apiUrl}/users`;
    
    constructor(private http: HttpClient) { }
    
    getAll(params: { page: number, limit: number, permissions?: string, search?: string }): Observable<PaginatedUsersResponse> {
        let httpParams = new HttpParams().set('page', params.page.toString()).set('limit', params.limit.toString());
        if (params.permissions && params.permissions !== 'all') {
            httpParams = httpParams.set('permissions', params.permissions);
        }
        if (params.search) {
            httpParams = httpParams.set('search', params.search);
        }     
        return this.http.get<PaginatedUsersResponse>(this.apiUrl, { params: httpParams });
    }
    
    updatePermissions(id: string, permissions: number): Observable<User> {
        const updateUrl = `${this.apiUrl}/${id}/permissions`;
        const body = { permissions };
        return this.http.patch<User>(updateUrl, body);
    }
    
    delete(id: string): Observable<any> {
        const deleteUrl = `${this.apiUrl}/${id}`;
        return this.http.delete(deleteUrl);
    }
}