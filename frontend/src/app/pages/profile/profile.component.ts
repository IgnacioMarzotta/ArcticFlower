import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { ReportService } from '../../core/services/report.service';
import { MissionService } from 'src/app/core/services/mission.service';
import { Favorite } from '../../core/models/favorite.model';
import { Mission } from '../../core/models/mission.models';

export interface Report {
  _id?: string;
  user?: string;
  message: string;
  type: 'bug' | 'data_error' | 'feedback';
  species?: string;
  createdAt?: string;
  resolved?: boolean;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  imports: [CommonModule],
  standalone: true,
})

export class ProfileComponent implements OnInit {
  isUser: boolean = false;
  userData: any;
  favorites: Favorite[] = [];
  reports: Report[] = [];
  missions: Mission[] = [];
  
  constructor(
    private authService: AuthService,
    private favService: FavoriteService,
    private reportService: ReportService,
    private missionService: MissionService
  ) {}
  
  ngOnInit(): void {
    this.isUser = this.authService.isAuthenticated();
    console.log('isUser:', this.isUser);

    if(this.isUser) {
      this.initializeUserProfile();
      this.loadFavorites();
      this.loadReports();
      this.loadDailyMissions();
    }
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

  private loadReports() {
    this.reportService.getUserReports().subscribe({
      next: response => this.reports = response,
      error: err => console.error('No se pudieron cargar tus reportes', err)
    });
  }

  loadFavorites() {
    this.favService.getFavorites().subscribe(favs => this.favorites = favs);
  }

  private loadDailyMissions(): void {
    this.missionService.getDailyMissions().subscribe({
      next: data => {
        this.missions = data;
      },
      error: err => console.error('No se pudieron cargar misiones', err)
    });
  }
}