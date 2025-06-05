import { HttpEvent, HttpInterceptorFn, HttpHandlerFn, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

function addTokenHeaderToRequest(request: HttpRequest<any>, token: string): HttpRequest<any> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

function handleAuthError(
  request: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService
): Observable<HttpEvent<any>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);
    
    return authService.attemptRefreshToken().pipe(
      switchMap((newAccessToken: string) => {
        isRefreshing = false;
        refreshTokenSubject.next(newAccessToken);
        return next(addTokenHeaderToRequest(request, newAccessToken));
      }),
      catchError((refreshError) => {
        isRefreshing = false;
        return throwError(() => refreshError); 
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter(token => token != null),
      take(1),
      switchMap(jwt => next(addTokenHeaderToRequest(request, jwt)))
    );
  }
}

export const authInterceptorFn: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  const accessToken = authService.getAccessToken();
  
  let authReq = req;
  
  if (accessToken && req.url.startsWith(`${environment.apiUrl}`)) {
    authReq = addTokenHeaderToRequest(req, accessToken);
  }
  
  return next(authReq).pipe(
    catchError(error => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        req.url.startsWith(`${environment.apiUrl}`) &&
        error.error?.code === 'TOKEN_EXPIRED'
      ) {
        return handleAuthError(authReq, next, authService);
      }
      
      if (error instanceof HttpErrorResponse && error.status === 403 && error.error?.code === 'INVALID_REFRESH_TOKEN') {
        console.error("AuthInterceptor: El Refresh Token era inválido. El usuario debería haber sido deslogueado por AuthService.");
      }
      
      return throwError(() => error);
    })
  );
};