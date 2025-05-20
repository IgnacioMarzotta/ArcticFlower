import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError, from } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    private isRefreshing = false;
    
    constructor(private auth: AuthService) {}
    
    intercept(req: HttpRequest<any>, next: HttpHandler):
    Observable<HttpEvent<any>> {
        const accessToken = this.auth.getAccessToken();
        let authReq = req;
        if (accessToken) {
            authReq = req.clone({
                setHeaders: { Authorization: `Bearer ${accessToken}` }
            });
        }
        
        return next.handle(authReq).pipe(
            catchError(err => {
                if (err instanceof HttpErrorResponse 
                    && err.status === 401 
                    && err.error?.message === 'Token expired') {
                        return this.handle401(authReq, next);
                    }
                    return throwError(() => err);
                })
            );
        }
        
        private handle401(req: HttpRequest<any>, next: HttpHandler) {
            if (!this.isRefreshing) {
                this.isRefreshing = true;
                // Llama al endpoint /auth/refresh
                return from(this.auth.refreshToken()).pipe(
                    switchMap((newToken: string) => {
                        this.isRefreshing = false;
                        // Reintenta la petición original con el nuevo token
                        const retryReq = req.clone({
                            setHeaders: { Authorization: `Bearer ${newToken}` }
                        });
                        return next.handle(retryReq);
                    }),
                    catchError(err => {
                        this.isRefreshing = false;
                        this.auth.logout();  // Si el refresh falló, cierra sesión
                        return throwError(() => err);
                    })
                );
            } else {
                // Si ya estamos refrescando, espera y luego reintenta
                return next.handle(req);
            }
        }
    }