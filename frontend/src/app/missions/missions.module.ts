import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MissionListComponent } from './mission-list/mission-list.component';
import { MissionCardComponent } from './mission-card/mission-card.component';
import { MissionsRoutingModule } from './missions-routing.module';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { NgCircleProgressModule } from 'ng-circle-progress';

@NgModule({
  imports: [
    CommonModule,
    MissionsRoutingModule,
    MatCardModule,
    MatBadgeModule,
    MatButtonModule,
    MissionListComponent,
    MissionCardComponent,
    NgCircleProgressModule.forRoot({}),
  ]
})
export class MissionsModule {}
