import { Component, OnInit } from '@angular/core';
import { ReportService } from '../../../../core/services/report.service';
import { Report } from '../../../../core/models/report.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  templateUrl: './admin-reports.component.html',
  styleUrls: ['./admin-reports.component.scss'],
  imports: [CommonModule, FormsModule]
})

export class AdminReportsComponent implements OnInit {
  reports: Report[] = [];
  isLoading: boolean = false;

  currentPage = 1;
  totalPages = 0;
  limit = 10;
  filterStatus: string = 'all';

  constructor(private reportService: ReportService) { }

  ngOnInit(): void {
    this.fetchReports();
  }

  fetchReports(): void {
    this.isLoading = true;
    this.reportService.getAll(this.currentPage, this.limit, this.filterStatus).subscribe({
      next: (response) => {
        this.reports = response.reports;
        this.totalPages = response.totalPages;
        this.currentPage = response.currentPage;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[fetchReports] Error al obtener los reportes:', err);
        this.isLoading = false;
      }
    });
  }

  onFilterChange(): void {
    this.currentPage = 1; 
    this.fetchReports();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.fetchReports();
    }
  }

  getPagesArray(): number[] {
    return Array(this.totalPages).fill(0).map((x, i) => i + 1);
  }

  updateReportStatus(reportToUpdate: Report, newStatus: boolean): void {
    if (!reportToUpdate._id) {
      console.error('[fetchReports] El reporte no tiene un ID para ser actualizado.');
      return;
    }

    this.reportService.updateStatus(reportToUpdate._id, newStatus).subscribe({
      next: (updatedReport) => {
        const index = this.reports.findIndex(r => r._id === updatedReport._id);
        if (index !== -1) {
          this.reports[index] = updatedReport;
        }
        console.log(`[fetchReports] Reporte ${updatedReport._id} actualizado a: ${updatedReport.resolved}`);
      },
      error: (err) => {
        console.error('[fetchReports] Error al actualizar el estado del reporte:', err);
      }
    });
  }

  deleteReport(reportToDelete: Report): void {
    if (!reportToDelete._id) {
      console.error('[fetchReports] El reporte no tiene un ID para ser eliminado.');
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: `This action cannot be reverted. The following report will be deleted: "${reportToDelete.message.substring(0, 30)}..."`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, NUKE IT.',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.reportService.delete(reportToDelete._id!).subscribe({
          next: () => {
            this.reports = this.reports.filter(r => r._id !== reportToDelete._id);
            
            Swal.fire(
              'Deleted!',
              'Report has been eliminated.',
              'success'
            );
          },
          error: (err) => {
            console.error('Error removing report.', err);
            Swal.fire(
              'Error',
              'Unable to remove report, please try again later.',
              'error'
            );
          }
        });
      }
    });
  }
}