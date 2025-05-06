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
    this.userData = {
      username: 'UsuarioEjemplo',
      email: 'usuario@example.com',
      created_at: '2023-10-01'
    };
    this.loadFavorites();
  }

  loadFavorites() {
    this.favService.getFavorites().subscribe(favs => this.favorites = favs);
  }
}