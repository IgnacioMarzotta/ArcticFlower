import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';

import { HomeComponent } from './pages/home/home.component';
import { MapComponent } from './pages/map/map.component';
import { ProfileComponent } from './pages/profile/profile.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'auth', loadChildren: () => import('./modules/auth/auth.routes').then(m => m.AUTH_ROUTES) },
  { path: 'map', component: MapComponent },
  { path: 'admin', loadChildren: () => import('./modules/admin/admin.routes').then(m => m.ADMIN_ROUTES), canActivate: [AuthGuard, AdminGuard] },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
