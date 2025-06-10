import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminUsersComponent } from './components/admin-users/admin-users.component';
import { AdminSpeciesComponent } from './components/admin-species/admin-species.component';
import { AdminReportsComponent } from './components/admin-reports/admin-reports.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    AdminUsersComponent,
    AdminSpeciesComponent,
    AdminReportsComponent
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  currentSection: 'users' | 'species' | 'reports' = 'users';
  
  constructor() { }
  
  ngOnInit(): void {
  }
  
  showSection(section: 'users' | 'species' | 'reports'): void {
    this.currentSection = section;
  }
}