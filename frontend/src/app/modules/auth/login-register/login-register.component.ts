import { Component, OnInit, Renderer2, ElementRef, HostListener } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, FormBuilder, FormGroup, ValidationErrors, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Observable, timer, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
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
    loginPasswordVisible: boolean = false;
    registerPasswordVisible: boolean = false;
    confirmPasswordVisible: boolean = false;
    
    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private route: ActivatedRoute,
        private router: Router,
        private renderer: Renderer2,
        private hostEl: ElementRef
    ) {}
    
    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            const mode = params.get('mode');
            this.isLoginMode = (mode !== 'register');
        });
        
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required]
        });
        
        this.registerForm = this.fb.group({
            username: [
                '',
                [ Validators.required, Validators.maxLength(32), Validators.minLength(8) ],
                [ this.usernameAvailabilityValidator() ]
            ],
            email: [
                '', 
                [ Validators.required, Validators.email ], 
                [ this.emailAvailabilityValidator() ]
            ],
            password: ['', [
                Validators.required,
                Validators.minLength(8),
                Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).*$')
            ]],
            confirmPassword: ['', Validators.required]
        }, {
            validators: this.passwordsMatchValidator
        });
    }
    
    setMode(isLogin: boolean) {
        this.isLoginMode = isLogin;
        this.errorMessage = null;
    }
    
    onSubmit(): void {
        this.errorMessage = null;
        if (this.isLoginMode) {
            if (this.loginForm.invalid) return;
            this.authService.login(this.loginForm.value).subscribe({
                next: () => this.router.navigate(['/']),
                error: err =>
                    (this.errorMessage = err.error?.message || 'Invalid email or password.')
            });
        } else {
            if (this.registerForm.invalid) return;
            this.authService.register(this.registerForm.value).subscribe({
                next: () => {
                    this.isLoginMode = true;
                    this.loginForm.get('email')?.setValue(this.registerForm.get('email')?.value);
                },
                error: err =>
                    (this.errorMessage = err.error?.message || 'Registration failed. The email may already be in use.')
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
    
    @HostListener('focusout', ['$event.target'])
    onBlur(target: HTMLElement) {
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return;
        const label = target.previousElementSibling as HTMLElement;
        this.renderer.removeClass(label, 'highlight');
    }
    
    @HostListener('focusin', ['$event.target'])
    onFocus(target: HTMLElement) {
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return;
        const label = target.previousElementSibling as HTMLElement;
        const hasValue = (target as HTMLInputElement).value !== '';
        if (hasValue) {
            this.renderer.addClass(label, 'highlight');
        }
    }

    usernameAvailabilityValidator(): AsyncValidatorFn {
        return (control: AbstractControl): Observable<ValidationErrors | null> => {
            return timer(500).pipe(
                switchMap(() => {
                    if (!control.value) {
                        return of(null);
                    }
                    return this.authService.checkUsernameAvailability(control.value).pipe(
                        map(res => (res.isTaken ? { usernameTaken: true } : null))
                    );
                })
            );
        };
    }

    emailAvailabilityValidator(): AsyncValidatorFn {
        return (control: AbstractControl): Observable<ValidationErrors | null> => {
            return timer(500).pipe(
                switchMap(() => {
                    if (!control.value || control.hasError('email')) {
                        return of(null);
                    }
                    return this.authService.checkEmailAvailability(control.value).pipe(
                        map(res => (res.isTaken ? { emailTaken: true } : null))
                    );
                })
            );
        };
    }

  private passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    if (confirmPassword.errors && confirmPassword.errors['passwordsMismatch']) {
      if (password.value === confirmPassword.value) {
        delete confirmPassword.errors['passwordsMismatch'];
        if (Object.keys(confirmPassword.errors).length === 0) {
          confirmPassword.setErrors(null);
        } else {
          confirmPassword.setErrors(confirmPassword.errors);
        }
      }
    }

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ ...confirmPassword.errors, passwordsMismatch: true });
    }
    return null;
  }

    get regUsername() { return this.registerForm.get('username'); }
    get regEmail() { return this.registerForm.get('email'); }
    get regPassword() { return this.registerForm.get('password'); }
    get regConfirmPassword() { return this.registerForm.get('confirmPassword'); }
}
