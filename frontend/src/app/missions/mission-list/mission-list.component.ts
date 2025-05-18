import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MissionService } from '../../core/services/mission.service';
import { Mission } from '../../core/models/mission.models';
import { MissionCardComponent } from '../mission-card/mission-card.component';

@Component({
  selector: 'app-mission-list',
  standalone: true,
  imports: [
    CommonModule,
    MissionCardComponent
  ],
  templateUrl: './mission-list.component.html',
  styleUrls: ['./mission-list.component.scss']
})
export class MissionListComponent implements OnInit {
  missions: Mission[] = [];
  loading = true;

  constructor(
    private missionService: MissionService
  ) {}

  ngOnInit() {
    this.loadMissions();
  }

  onClaim(id: string) {
    this.missionService.claimMission(id).subscribe(() => {
      this.missions = this.missions.filter(m => m._id !== id);
    });
  }

  trackByFn(index: number, item: Mission) {
    return item._id;
  }

  onComplete(id: string) {
    this.missionService.completeMission(id).subscribe(() => {
      this.missions = this.missions.map(m =>
        m._id === id ? { ...m, completed: true } : m
      );
    });
  }
  
  loadMissions() {
    this.loading = true;
    this.missionService.getDailyMissions().subscribe({
      next: data => {
        this.missions = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }
}
