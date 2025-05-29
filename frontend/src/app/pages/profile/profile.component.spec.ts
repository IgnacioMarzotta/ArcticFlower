import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileComponent, Report } from './profile.component';
import { AuthService } from '../../core/services/auth.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { ReportService } from '../../core/services/report.service';
import { MissionService } from 'src/app/core/services/mission.service';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';

class AuthServiceStub {
  isAuthenticated() { return true; }
  getProfile() {
    return of({ username: 'alice', email: 'a@b.com', created_at: '2020-01-01' });
  }
}

class FavoriteServiceStub {
  getFavorites() {
    return of([ { speciesId: { common_name: 'Tiger', _id: 's1' }, clusterId: { country: 'US', _id: 'c1' } } ]);
  }
}

class ReportServiceStub {
  getUserReports() {
    const reports: Report[] = [
      { message: 'Hi', type: 'feedback', createdAt: '2021-05-05', resolved: false }
    ];
    return of(reports);
  }
}

class MissionServiceStub {
  getDailyMissions() {
    return of([ { _id: 'm1', description: 'Do X', completed: true, missionId: { type: 'test' }, progress: {} } ]);
  }
}

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ProfileComponent,
        CommonModule
      ],
      providers: [
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: FavoriteService, useClass: FavoriteServiceStub },
        { provide: ReportService, useClass: ReportServiceStub },
        { provide: MissionService, useClass: MissionServiceStub },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component and load profile data', () => {
    expect(component).toBeTruthy();
    expect(component.userData).toEqual(jasmine.objectContaining({
      username: 'alice', email: 'a@b.com'
    }));
  });

  it('should display username and email in template', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.username')?.textContent).toContain('alice');
    expect(el.querySelector('.email')?.textContent).toContain('a@b.com');
    expect(el.querySelector('.member-since')?.textContent).toContain('Jan');
  });

  it('should render favorite species count and name', () => {
    const el = fixture.nativeElement as HTMLElement;
    const favHeader = el.querySelector('h3')?.textContent;
    expect(favHeader).toContain('Favorite species (1)');
    expect(el.querySelector('.fav-name')?.textContent).toContain('Tiger');
  });

  it('should list user reports', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.reports h3')?.textContent).toContain('Your reports');
    expect(el.querySelectorAll('.reports ul li').length).toBe(1);
    expect(el.querySelector('.reports ul li')?.textContent).toContain('Hi');
  });

  it('should list current missions', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.missions h3')?.textContent).toContain('Current missions');
    expect(el.querySelectorAll('.missions ul li').length).toBe(1);
    expect(el.querySelector('.missions ul li')?.textContent).toContain('Do X');
  });
});