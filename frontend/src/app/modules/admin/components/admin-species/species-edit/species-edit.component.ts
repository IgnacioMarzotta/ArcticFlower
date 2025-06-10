import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SpeciesService } from 'src/app/core/services/species.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-species-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './species-edit.component.html',
  styleUrls: ['./species-edit.component.scss']
})
export class SpeciesEditComponent implements OnInit {
  speciesForm: FormGroup;
  speciesId: string | null = null;
  isLoading = true;
  
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private speciesService: SpeciesService
  ) {
    this.speciesForm = this.fb.group({
      scientific_name: ['', Validators.required],
      common_name: [''],
      category: ['', Validators.required],
      kingdom: [''],
      phylum: [''],
      class: [''],
      order: [''],
      family: [''],
      genus: [''],
      
      description: this.fb.group({
        rationale: [''],
        habitat: [''],
        threats: [''],
        population: [''],
        populationTrend: [''],
        range: [''],
        useTrade: [''],
        conservationActions: [''],
      }),
      
      locations: this.fb.array([]),
      media: this.fb.array([]),
    });
  }
  
  ngOnInit(): void {
    this.speciesId = this.route.snapshot.paramMap.get('id');
    if (this.speciesId) {
      this.speciesService.getSpeciesById(this.speciesId).subscribe(speciesData => {
        this.populateForm(speciesData);
        this.isLoading = false;
      });
    }
  }
  
  get locations(): FormArray {
    return this.speciesForm.get('locations') as FormArray;
  }
  
  newLocation(): FormGroup {
    return this.fb.group({
      country: ['', Validators.required],
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
  
  get media(): FormArray {
    return this.speciesForm.get('media') as FormArray;
  }
  
  newMedia(): FormGroup {
    return this.fb.group({
      type: ['StillImage', Validators.required],
      format: ['image/jpeg'],
      identifier: ['', Validators.required],
      title: [''],
      description: [''],
      creator: [''],
      contributor: [''],
      publisher: [''],
      rightsHolder: [''],
      license: ['']
    });
  }
  
  addMedia() {
    this.media.push(this.newMedia());
  }
  removeMedia(i: number) {
    this.media.removeAt(i);
  }
  
  populateForm(data: any) {
    this.speciesForm.patchValue(data);
    
    data.locations.forEach((loc: any) => {
      const locationGroup = this.newLocation();
      locationGroup.patchValue(loc);
      this.locations.push(locationGroup);
    });
    
    data.media.forEach((med: any) => {
      const mediaGroup = this.newMedia();
      mediaGroup.patchValue(med);
      this.media.push(mediaGroup);
    });
  }
  
  onSubmit() {
    if (this.speciesForm.invalid) {
      Swal.fire('Invalid form', 'Please, check all required fields.', 'error');
      return;
    }
    if (this.speciesId) {
      this.speciesService.updateSpecies(this.speciesId, this.speciesForm.value).subscribe({
        next: () => {
          Swal.fire('Saved!', 'Species was successfully updated.', 'success');
          this.router.navigate(['/admin']);
        },
        error: (err) => Swal.fire('Error', err.error?.message || 'Unable to update species.', 'error')
      });
    }
  }
}