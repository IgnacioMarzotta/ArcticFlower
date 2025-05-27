import { Component, OnInit, Renderer2, ElementRef, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-login-register',
    standalone: true,
    imports: [ CommonModule, ReactiveFormsModule, RouterModule ],
    templateUrl: './login-register.component.html',
    styleUrls: ['./login-register.component.scss']
})

export class LoginRegisterComponent implements OnInit {
    isLoginMode = true;
    loginForm!: FormGroup;
    registerForm!: FormGroup;
    errorMessage: string | null = null;
    
    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private route: ActivatedRoute,
        private router: Router,
        private renderer: Renderer2,
        private hostEl: ElementRef
    ) {}
    
    ngOnInit(): void {
        // Inicializo modo según ruta opcional
        this.route.paramMap.subscribe(params => {
            const mode = params.get('mode');
            this.isLoginMode = (mode !== 'register');
        });

        // Formularios reactivos
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required]
        });
        
        this.registerForm = this.fb.group({
            username: ['', [Validators.required, Validators.maxLength(32)]],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }
    
    setMode(isLogin: boolean) {
        this.isLoginMode = isLogin;
    }
    
    onSubmit(): void {
        this.errorMessage = null;
        if (this.isLoginMode) {
            if (this.loginForm.invalid) return;
            this.authService.login(this.loginForm.value).subscribe({
                next: () => this.router.navigate(['/']),
                error: err =>
                    (this.errorMessage = err.error?.message || 'Error en login')
            });
        } else {
            if (this.registerForm.invalid) return;
            this.authService.register(this.registerForm.value).subscribe({
                next: () => (this.isLoginMode = true),
                error: err =>
                    (this.errorMessage = err.error?.message || 'Error en registro')
            });
        }
    }
    
    @HostListener('input', ['$event.target'])
    @HostListener('keyup', ['$event.target'])
    onInput(target: HTMLElement) {
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return;
        const label = target.previousElementSibling as HTMLElement;
        const hasValue = (target as HTMLInputElement).value !== '';
        if (hasValue) {
            this.renderer.addClass(label, 'active');
            this.renderer.addClass(label, 'highlight');
        } else {
            this.renderer.removeClass(label, 'active');
            this.renderer.removeClass(label, 'highlight');
        }
    }
    
    /** Al perder foco, remueve sólo highlight si queda texto */
    @HostListener('focusout', ['$event.target'])
    onBlur(target: HTMLElement) {
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return;
        const label = target.previousElementSibling as HTMLElement;
        this.renderer.removeClass(label, 'highlight');
    }
    
    /** Al ganar foco, resalta si ya hay texto */
    @HostListener('focusin', ['$event.target'])
    onFocus(target: HTMLElement) {
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return;
        const label = target.previousElementSibling as HTMLElement;
        const hasValue = (target as HTMLInputElement).value !== '';
        if (hasValue) {
            this.renderer.addClass(label, 'highlight');
        }
    }
}
