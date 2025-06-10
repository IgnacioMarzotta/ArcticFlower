import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { SpeciesService } from '../../../../core/services/species.service';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';

interface AdminSpecies {
  _id: string;
  scientific_name: string;
  common_name: string;
  category: string;
}

@Component({
  selector: 'app-admin-species',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule ],
  templateUrl: './admin-species.component.html',
  styleUrls: ['./admin-species.component.scss']
})

export class AdminSpeciesComponent implements OnInit, OnDestroy {
  speciesList: AdminSpecies[] = [];
  isLoading: boolean = false;
  hasSearched: boolean = false;
  
  currentPage = 1;
  totalPages = 0;
  limit = 10;
  searchTerm: string = '';
  filterCategory: string = 'all';
  
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;
  
  constructor(private speciesService: SpeciesService) { }
  
  ngOnInit(): void {
    this.searchSubscription = this.searchSubject.pipe(
      filter(term => term.length >= 3 || term.length === 0),
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1;
      this.fetchSpecies();
    });
  }
  
  ngOnDestroy(): void {
    this.searchSubscription.unsubscribe();
  }
  
  fetchSpecies(): void {
    if (this.searchTerm.trim().length < 3) {
      this.speciesList = [];
      this.totalPages = 0;
      this.hasSearched = false;
      return;
    }
    
    this.isLoading = true;
    this.hasSearched = true;
    
    const params = {
      page: this.currentPage,
      limit: this.limit,
      search: this.searchTerm,
      category: this.filterCategory
    };
    
    this.speciesService.getAllSpecies(params).subscribe({
      next: (response) => {
        this.speciesList = response.species as AdminSpecies[];
        this.totalPages = response.totalPages;
        this.currentPage = response.page;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching species:', err);
        this.isLoading = false;
      }
    });
  }
  
  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }
  
  onFilterChange(): void {
    if (this.hasSearched) {
      this.currentPage = 1;
      this.fetchSpecies();
    }
  }
  
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.fetchSpecies();
    }
  }
  
  getPagesArray(): number[] {
    return Array(this.totalPages).fill(0).map((x, i) => i + 1);
  }
  
  editSpecies(speciesToEdit: AdminSpecies): void {
    Swal.fire({
      title: `Edit: ${speciesToEdit.scientific_name}`,
      html: `
        <div class="swal-form">
          <label for="swal-common-name">Common/Vernacular Name</label>
          <input id="swal-common-name" class="swal2-input" value="${speciesToEdit.common_name || ''}">
          
          <label for="swal-category">IUCN Category</label>
          <select id="swal-category" class="swal2-select">
            <option value="EX" ${speciesToEdit.category === 'EX' ? 'selected' : ''}>Extinct (EX)</option>
            <option value="EW" ${speciesToEdit.category === 'EW' ? 'selected' : ''}>Extinct in the Wild (EW)</option>
            <option value="CR" ${speciesToEdit.category === 'CR' ? 'selected' : ''}>Critically Endangered (CR)</option>
          </select>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Save changes',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const commonNameInput = document.getElementById('swal-common-name') as HTMLInputElement;
        const categorySelect = document.getElementById('swal-category') as HTMLSelectElement;
        return {
          common_name: commonNameInput.value,
          category: categorySelect.value
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const updatedData = result.value;
        this.speciesService.updateSpecies(speciesToEdit._id, updatedData).subscribe({
          next: (updatedSpecies) => {
            const index = this.speciesList.findIndex(s => s._id === updatedSpecies._id);
            if (index !== -1) {
              this.speciesList[index] = {
                _id: updatedSpecies._id,
                scientific_name: updatedSpecies.scientific_name,
                common_name: updatedSpecies.common_name,
                category: updatedSpecies.category
              };
            }
            Swal.fire('Saved!', 'Species has been successfully updated.', 'success');
          },
          error: (err) => {
            Swal.fire('Error', err.error?.message || 'Unable to save species.', 'error');
          }
        });
      }
    });
  }
  
  deleteSpecies(speciesId: string, speciesName: string): void {
    Swal.fire({
      title: '¿Estás seguro?',
      html: `Se eliminará permanentemente la especie <b>${speciesName}</b>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Sí, ¡eliminar!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.speciesService.deleteSpecies(speciesId).subscribe({
          next: () => {
            Swal.fire('¡Eliminada!', 'La especie ha sido eliminada.', 'success');
            this.fetchSpecies(); 
          },
          error: (err) => Swal.fire('Error', err.error?.message, 'error')
        });
      }
    });
  }
}