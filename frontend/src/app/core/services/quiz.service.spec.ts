import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { QuizService } from './quiz.service';
import { ActiveQuizData, UserQuizStatus, QuizSubmission, QuizSubmissionResponse } from '../models/quiz.models';
import { environment } from '../../../environments/environment';

describe('QuizService', () => {
  let service: QuizService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/quizzes`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [QuizService]
    });
    service = TestBed.inject(QuizService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUserQuizStatus', () => {
    it('should return UserQuizStatus on successful GET request', () => {
      const mockStatus: UserQuizStatus = {
        status: 'PENDING_ATTEMPT_1',
        message: 'Primer intento del cuestionario requerido.',
        quizIdentifier: 'main_arcticflower_quiz',
        quizVersion: 1,
        attemptNumber: 1
      };

      service.getUserQuizStatus().subscribe(status => {
        expect(status).toEqual(mockStatus);
      });

      const req = httpMock.expectOne(`${apiUrl}/status`);
      expect(req.request.method).toBe('GET');
      req.flush(mockStatus);
    });
  });

  describe('getActiveQuiz', () => {
    it('should return ActiveQuizData on successful GET request', () => {
      const mockActiveQuiz: ActiveQuizData = {
        quiz_identifier: 'main_arcticflower_quiz',
        version: 1,
        description: 'Test your knowledge!',
        questions: [
          { question_id: 'q1', text: 'Q1?', options: ['A', 'B'], justification: 'Justify Q1', correct_option_index: 0 }
        ]
      };

      service.getActiveQuiz().subscribe(data => {
        expect(data).toEqual(mockActiveQuiz);
        expect(data.questions.length).toBe(1);
      });

      const req = httpMock.expectOne(`${apiUrl}/active`);
      expect(req.request.method).toBe('GET');
      req.flush(mockActiveQuiz);
    });
  });

  describe('submitAttempt', () => {
    it('should return QuizSubmissionResponse on successful POST request', () => {
      const mockSubmission: QuizSubmission = {
        quizIdentifier: 'main_arcticflower_quiz',
        quizVersion: 1,
        attemptNumber: 1,
        answers: [{ question_id: 'q1', selected_option_index: 0 }]
      };
      const mockResponse: QuizSubmissionResponse = {
        message: 'Intento enviado con éxito.',
        attemptId: 'someAttemptId',
        score: 1,
        totalQuestions: 1
      };

      service.submitAttempt(mockSubmission).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/submit`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockSubmission);
      req.flush(mockResponse);
    });
  });
});