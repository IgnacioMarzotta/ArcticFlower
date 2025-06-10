import { Routes } from '@angular/router';
import { LoginRegisterComponent } from './login-register/login-register.component';

export const AUTH_ROUTES: Routes = [
  {
    path: '', 
    component: LoginRegisterComponent 
  },
  {
    path: ':mode', 
    component: LoginRegisterComponent
  }
  //Aqui puede definirse mas adelante rutas relacionadas con autenticacion. Por ejemplo, pagina de re-establecimiento de contraseña o rutas para inicio de sesion con google omniauth.
];