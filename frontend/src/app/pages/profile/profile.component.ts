import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { Favorite } from '../../core/models/favorite.model';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  imports: [CommonModule],
  standalone: true,
})

export class ProfileComponent implements OnInit {
  userData: any;
  favorites: Favorite[] = [];
  
  constructor(
    private authService: AuthService,
    private favService: FavoriteService,
  ) {}
  
  ngOnInit(): void {
    this.initializeUserProfile();
    this.loadFavorites();
  }
  
  private initializeUserProfile() {
    this.authService.getProfile().subscribe({
      next: data => {
        this.userData = data;
      },
      error: err => {
        console.error('No se pudo cargar el perfil', err);
      }
    });
  }

  loadFavorites() {
    this.favService.getFavorites().subscribe(favs => this.favorites = favs);
  }
}