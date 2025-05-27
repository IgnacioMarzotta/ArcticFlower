import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthRoutingModule } from './auth-routing.module';
import { LoginRegisterComponent } from './login-register/login-register.component';

@NgModule({
  declarations: [],
  imports: [CommonModule,ReactiveFormsModule,AuthRoutingModule,LoginRegisterComponent]
})
export class AuthModule { }