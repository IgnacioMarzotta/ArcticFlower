import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface MissionEvent {
  type: string;
  payload: any;
}

@Injectable({ providedIn: 'root' })
export class MissionEventService {
  private events$ = new Subject<MissionEvent>();
  emit(event: MissionEvent) {
    console.log('Emitting event:', event);
    this.events$.next(event);
  }
  on() {
    return this.events$.asObservable();
  }
}
