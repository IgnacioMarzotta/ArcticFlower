import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCardModule } from '@angular/material/card';
import { MissionService } from '../../core/services/mission.service';
import { Mission } from '../../core/models/mission.models';

@Component({
  selector: 'app-mission-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatBadgeModule,
    MatButtonModule,
    NgCircleProgressModule
  ],
  templateUrl: './mission-card.component.html',
  styleUrls: ['./mission-card.component.scss']
})
export class MissionCardComponent {
  @Input() mission!: Mission;
  @Output() complete = new EventEmitter<string>();
  @Output() claim    = new EventEmitter<string>();

  constructor(
    private missionService: MissionService,
  ) {}

  onClaim() {
    this.claim.emit(this.mission._id);
  }

  onComplete() {
    this.complete.emit(this.mission._id);
  }
}