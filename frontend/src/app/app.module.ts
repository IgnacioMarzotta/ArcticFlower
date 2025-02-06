import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { NavbarComponent } from './components/navbar/navbar.component';
import { HomeComponent } from './pages/home/home.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { MapComponent } from './pages/map/map.component';

@NgModule({
    imports: [
        BrowserModule,
        AppRoutingModule,
        FormsModule,
        NavbarComponent,
        HomeComponent,
        ProfileComponent,
        MapComponent
    ],
    providers: [provideHttpClient(withInterceptorsFromDi())]
})
export class AppModule { }