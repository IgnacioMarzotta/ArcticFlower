import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SpeciesService } from '../../../../../core/services/species.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-species-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './species-create.component.html',
  styleUrls: ['../species-edit/species-edit.component.scss'] 
})
export class SpeciesCreateComponent implements OnInit {
  speciesForm: FormGroup;
  
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private speciesService: SpeciesService
  ) {
    this.speciesForm = this.fb.group({
      scientific_name: ['', Validators.required],
      genus: ['', Validators.required],
      taxon_id: ['', Validators.required],
      category: ['', Validators.required],
      common_name: ['Unknown'],
      kingdom: ['Unknown'],
      phylum: ['Unknown'],
      class: ['Unknown'],
      order: ['Unknown'],
      family: ['Unknown'],
      description: this.fb.group({ }),
      locations: this.fb.array([]),
      media: this.fb.array([]),
    });
  }
  
  ngOnInit(): void {
    this.addLocation();
  }
  
  newLocation(): FormGroup {
    return this.fb.group({
      country: ['', [Validators.required, Validators.pattern(/^[A-Z]{2}$/)]],
      continent: ['', Validators.required],
      lat: [0, Validators.required],
      lng: [0, Validators.required],
    });
  }

  addLocation() {
    this.locations.push(this.newLocation());
  }

  removeLocation(i: number) {
    this.locations.removeAt(i);
  }
  
  onSubmit() {
    if (this.speciesForm.invalid) {
      Swal.fire('Invalid form', 'Please fill all required fields (*).', 'error');
      return;
    }
    
    this.speciesService.createSpecies(this.speciesForm.value).subscribe({
      next: (newSpecies) => {
        Swal.fire('Success!', `Species ${newSpecies.scientific_name} has been created.`, 'success');
        this.router.navigate(['/admin']);
      },
      error: (err) => Swal.fire('Error', err.error?.message || 'Unable to create the species.', 'error')
    });
  }

  get locations(): FormArray {
    return this.speciesForm.get('locations') as FormArray;
  }
}