import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { ReportService } from 'src/app/core/services/report.service';
import { Report } from 'src/app/core/models/report.model';


@Component({
  selector: 'app-info-icon',
  templateUrl: './info-icon.component.html',
  styleUrls: ['./info-icon.component.scss'],
  imports: [CommonModule, FormsModule],
})
export class InfoIconComponent {
  @Input() tooltip = 'Información';
  showModal = false;
  
  message = '';
  type: Report['type'] = 'feedback';
  speciesId: string | null = null;
  submitting = false;
  
  constructor(private reportService: ReportService) {}
  
  ngOnInit() {
    this.reportService.openReport$.subscribe(id => {
      this.speciesId = id ?? null;
      this.showModal = true;
    });
  }
  
  toggleModal() {
    this.showModal = !this.showModal;
    if (!this.showModal) this.speciesId = null;
  }
  
  submitReport() {
    if (!this.message.trim()) return;
    this.submitting = true;
    this.reportService.create({
      message: this.message,
      type: this.type,
      species: this.speciesId ?? undefined
    })
    .subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Report sent!',
          text: 'Thanks for your time.',
          timer: 2000,
          showConfirmButton: false,
          willClose: () => {
            this.message = '';
            this.type = 'feedback';
            this.showModal = false;
          }
        });
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Could not send the report. Please try again later.',
        });
      },
      complete: () => this.submitting = false
    });
  }
}