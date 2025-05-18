import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { NavbarComponent } from './components/navbar/navbar.component';
import { InfoIconComponent } from './components/info-icon/info-icon.component';
import { MissionEngineService } from './core/services/mission-engine.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterOutlet, InfoIconComponent, NgCircleProgressModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'frontend';
  constructor(private missionEngine: MissionEngineService) { }
}
