import { Injectable } from '@angular/core';
import { MissionService } from './mission.service';
import { MissionEventService, MissionEvent } from './mission-event.service';
import { tap } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { Mission } from '../models/mission.models';

@Injectable({ providedIn: 'root' })
export class MissionEngineService {
  public missions$ = new BehaviorSubject<Mission[]>([]);

  constructor(
    private missionService: MissionService,
    private missionEvents: MissionEventService
  ) {
    this.loadMissions();
    this.missionEvents.on().subscribe(event => this.processEvent(event));
  }

  private loadMissions() {
    this.missionService.getDailyMissions()
      .subscribe(missions => this.missions$.next(missions));
  }

  private processEvent(event: MissionEvent) {
    const current = this.missions$.value;

    current
      .filter(m => !m.completed)
      .forEach(m => {
        this.missionService.handleEvent(m._id, event)
          .pipe(
            tap(response => {
              const updated = this.missions$.value.map(x =>
                x._id === m._id
                  ? {
                      ...x,
                      completed: response.completed,
                      progress:  response.progress
                    }
                  : x
              );
              this.missions$.next(updated);
            })
          )
          .subscribe();
      });
  }
}