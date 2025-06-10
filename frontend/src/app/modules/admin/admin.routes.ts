import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { SpeciesEditComponent } from './components/admin-species/species-edit/species-edit.component';
import { SpeciesCreateComponent } from './components/admin-species/species-create/species-create.component';

export const ADMIN_ROUTES: Routes = [
  { path: '', component: AdminComponent},
  { path: 'species/edit/:id', component: SpeciesEditComponent },
  { path: 'species/create', component: SpeciesCreateComponent }
];