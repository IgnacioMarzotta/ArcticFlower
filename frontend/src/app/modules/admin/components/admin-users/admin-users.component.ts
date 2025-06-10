import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UserService, PaginatedUsersResponse } from '../../../../core/services/user.service';
import { User } from '../../../../core/models/user.model';
import { AuthService } from '../../../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})

export class AdminUsersComponent implements OnInit, OnDestroy {
  users: User[] = [];
  isLoading: boolean = false;
  
  currentPage = 1;
  totalPages = 0;
  limit = 10;
  
  filterPermissions: string = 'all';
  searchTerm: string = '';
  
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;
  
  constructor(
    private userService: UserService,
    private authService: AuthService
  ) { }
  
  ngOnInit(): void {
    this.fetchUsers();
    
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1;
      this.fetchUsers();
    });
  }
  
  ngOnDestroy(): void {
    this.searchSubscription.unsubscribe();
  }
  
  fetchUsers(): void {
    this.isLoading = true;
    const params = {
      page: this.currentPage,
      limit: this.limit,
      permissions: this.filterPermissions,
      search: this.searchTerm
    };
    
    this.userService.getAll(params).subscribe({
      next: (response) => {
        this.users = response.users;
        this.totalPages = response.totalPages;
        this.currentPage = response.currentPage;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching users:', err);
        this.isLoading = false;
      }
    });
  }
  
  onFilterChange(): void {
    this.currentPage = 1;
    this.fetchUsers();
  }
  
  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }
  
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.fetchUsers();
    }
  }
  
  getPagesArray(): number[] {
    return Array(this.totalPages).fill(0).map((x, i) => i + 1);
  }
  
  deleteUser(userToDelete: User): void {
    if (!userToDelete._id) return;
    
    if (userToDelete._id === this.authService.currentUserValue?.id) {
      Swal.fire('Action not allowed.', 'This is awkward, you cant delete yourself!', 'error');
      return;
    }
    
    if (userToDelete.permissions === 1) {
      Swal.fire('Action not allowed.', 'Cannot delete another administrator, please demote first.', 'error');
      return;
    }
    
    Swal.fire({
      title: 'Are you sure?',
      html: `user <b>${userToDelete.username}</b> will be permanently deleted. <br>This ir irreversible!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: "Yes, NUKE 'EM",
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.userService.delete(userToDelete._id!).subscribe({
          next: (response) => {
            this.users = this.users.filter(u => u._id !== userToDelete._id);
            Swal.fire('Removed!', response.message || 'User has been deleted.', 'success');
          },
          error: (err) => {
            console.error('Error deleting user:', err);
            Swal.fire('Error', err.error?.message || 'Cannot remove user.', 'error');
          }
        });
      }
    });
  }
  
  changeUserPermissions(userToUpdate: User, newPerms: number): void {
    if (userToUpdate._id === this.authService.currentUserValue?.id) {
      Swal.fire('Action not allowed', 'Welp, seems like you cannot edit your own permisions (makes sense).', 'error');
      return;
    }
    
    this.userService.updatePermissions(userToUpdate._id, newPerms).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(u => u._id === updatedUser._id);
        if (index !== -1) {
          this.users[index] = updatedUser;
        }
        Swal.fire('Success!', `Permissions updated for user ${updatedUser.username}.`, 'success');
      },
      error: (err) => {
        console.error('Error updating permissions:', err);
        Swal.fire('Error', err.error?.message || 'Cannot update permissions.', 'error');
      }
    });
  }
  
}