import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActiveQuizData, UserQuizStatus, QuizSubmission, QuizSubmissionResponse } from '../models/quiz.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private apiUrl = `${environment.apiUrl}/quizzes`;

  constructor(private http: HttpClient) { }

  getUserQuizStatus(): Observable<UserQuizStatus> {
    return this.http.get<UserQuizStatus>(`${this.apiUrl}/status`);
  }

  getActiveQuiz(): Observable<ActiveQuizData> {
    return this.http.get<ActiveQuizData>(`${this.apiUrl}/active`);
  }

  submitAttempt(submission: QuizSubmission): Observable<QuizSubmissionResponse> {
    return this.http.post<QuizSubmissionResponse>(`${this.apiUrl}/submit`, submission);
  }
}