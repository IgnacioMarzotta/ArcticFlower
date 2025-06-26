import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap, take, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  
  constructor(private authService: AuthService, private router: Router) {}
  
  canActivate(): Observable<boolean> {
    
    return this.authService.currentUser.pipe(
      take(1), 
      
      switchMap((user: User | null) => {
        
        if (user && user.permissions !== undefined) {
          console.log('[AdminGuard] User data already exists. Validating permissions...');
          const isAdmin = user.permissions === 1;
          if (!isAdmin) {
            this.router.navigate(['/']);
          }
          return of(isAdmin);
        }
        console.log('[AdminGuard] User data not found, requesting profile...');
        return this.authService.getProfile().pipe(
          map(profile => {
            const isAdmin = profile.permissions === 1;
            console.log('[AdminGuard] Profile response.', { isAdmin });
            if (!isAdmin) {
              console.error('Access denied: Profile is not administrator.');
              this.router.navigate(['/']);
            }
            return isAdmin;
          }),
          
          catchError(() => {
            console.error('[AdminGuard] Error requesting profile. Access denied.');
            this.router.navigate(['/']);
            return of(false);
          })
        );
      })
    );
  }
}