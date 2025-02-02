import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  userData: any;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Obtener datos del usuario (mock temporal)
    this.userData = {
      username: 'UsuarioEjemplo',
      email: 'usuario@example.com',
      created_at: '2023-10-01'
    };
  }
}