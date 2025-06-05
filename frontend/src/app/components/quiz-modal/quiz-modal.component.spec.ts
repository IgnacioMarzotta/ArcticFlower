import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { QuizModalComponent } from './quiz-modal.component';
import { QuizService } from '../../core/services/quiz.service';
import { ActiveQuizData, QuizQuestion, QuizSubmissionResponse } from '../../core/models/quiz.models';
import { ChangeDetectionStrategy } from '@angular/core';

class MockQuizService {
    submitAttempt = jasmine.createSpy('submitAttempt').and.returnValue(of({
        message: 'Success',
        attemptId: '123',
        score: 1,
        totalQuestions: 1
    } as QuizSubmissionResponse));
}

const mockQuizQuestion1: QuizQuestion = {
    question_id: 'q1',
    text: 'Pregunta 1?',
    options: ['OpA', 'OpB_Correcta'],
    justification: 'Justificación para Q1',
    correct_option_index: 1
};
const mockQuizQuestion2: QuizQuestion = {
    question_id: 'q2',
    text: 'Pregunta 2?',
    options: ['OpX_Correcta', 'OpY'],
    justification: 'Justificación para Q2',
    correct_option_index: 0
};

const mockQuizData: ActiveQuizData = {
    quiz_identifier: 'test_quiz',
    version: 1,
    description: 'Un cuestionario de prueba',
    questions: [mockQuizQuestion1, mockQuizQuestion2]
};


describe('QuizModalComponent', () => {
    let component: QuizModalComponent;
    let fixture: ComponentFixture<QuizModalComponent>;
    let quizService: MockQuizService;
    
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                CommonModule,
                FormsModule,
                HttpClientTestingModule,
                QuizModalComponent
            ],
            providers: [
                { provide: QuizService, useClass: MockQuizService }
            ]
        }).compileComponents();
        
        fixture = TestBed.createComponent(QuizModalComponent);
        component = fixture.componentInstance;
        quizService = TestBed.inject(QuizService) as unknown as MockQuizService;
        
        component.quizData = JSON.parse(JSON.stringify(mockQuizData));
        component.attemptNumber = 1;
    });
    
    it('should create', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });
    
    it('should initialize displayQuestions from quizData on ngOnInit', () => {
        fixture.detectChanges();
        expect(component.displayQuestions.length).toBe(mockQuizData.questions.length);
        expect(component.displayQuestions[0].question_id).toBe(mockQuizData.questions[0].question_id);
        expect(component.displayQuestions[0].answered).toBe(false);
    });
    
    it('should close modal if quizData has no questions on init', () => {
        spyOn(component.quizClosed, 'emit');
        component.quizData = { ...mockQuizData, questions: [] };
        fixture.detectChanges();
        expect(component.quizClosed.emit).toHaveBeenCalledWith(false);
    });
    
    it('should close modal if quizData is not properly initialized on init', () => {
        spyOn(component.quizClosed, 'emit');
        component.quizData = null as any;
        fixture.detectChanges();
        expect(component.quizClosed.emit).toHaveBeenCalledWith(false);
    });
    
    
    describe('Question Navigation & Answering', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });
        
        it('should select an option', () => {
            component.selectOption(0);
            expect(component.currentQuestion?.user_selected_option_index).toBe(0);
        });
        
        it('should not select an option if question is already answered', () => {
            component.currentQuestion!.answered = true;
            component.selectOption(0);
            expect(component.currentQuestion?.user_selected_option_index).toBeUndefined();
        });
        
        it('confirmAnswer should mark question as answered, check correctness, and show feedback', () => {
            component.selectOption(1);
            component.confirmAnswer();
            
            expect(component.currentQuestion?.answered).toBeTrue();
            expect(component.currentQuestion?.user_was_correct).toBeTrue();
            expect(component.showFeedbackForCurrent).toBeTrue();
            expect(component.userAnswersInternal.length).toBe(1);
            expect(component.userAnswersInternal[0]).toEqual({
                question_id: mockQuizQuestion1.question_id,
                selected_option_index: 1
            });
            
            component.proceedToNext();
            fixture.detectChanges();
            
            component.selectOption(1);
            component.confirmAnswer();
            expect(component.currentQuestion?.answered).toBeTrue();
            expect(component.currentQuestion?.user_was_correct).toBeFalse();
            expect(component.showFeedbackForCurrent).toBeTrue();
            expect(component.userAnswersInternal.length).toBe(2);
        });
        
        it('proceedToNext should move to the next question or finalize', () => {
            component.selectOption(0);
            component.confirmAnswer();
            fixture.detectChanges();
            
            component.proceedToNext();
            expect(component.currentQuestionIndex).toBe(1);
            expect(component.showFeedbackForCurrent).toBeFalse();
            expect(component.currentQuestion?.question_id).toBe(mockQuizQuestion2.question_id);
            
            component.selectOption(0);
            component.confirmAnswer();
            fixture.detectChanges();
            
            spyOn(component, 'submitFullQuiz');
            component.proceedToNext();
            expect(component.quizFlowCompleted).toBeTrue();
            expect(component.submitFullQuiz).toHaveBeenCalled();
        });
    });
    
    describe('submitFullQuiz', () => {
        beforeEach(() => {
            fixture.detectChanges();
            component.userAnswersInternal = [
                { question_id: 'q1', selected_option_index: 1 },
                { question_id: 'q2', selected_option_index: 0 }
            ];
            component.quizFlowCompleted = true;
        });
        
        it('should call quizService.submitAttempt and handle success', fakeAsync(() => {
            const mockResponse: QuizSubmissionResponse = {
                message: 'Éxito!',
                attemptId: 'attempt-123',
                score: 2,
                totalQuestions: 2
            };
            quizService.submitAttempt.and.returnValue(of(mockResponse));
            
            component.submitFullQuiz();
            tick();
            
            expect(quizService.submitAttempt).toHaveBeenCalledWith({
                quizIdentifier: mockQuizData.quiz_identifier,
                quizVersion: mockQuizData.version,
                attemptNumber: 1,
                answers: component.userAnswersInternal
            });
            expect(component.isSubmittingQuiz).toBeFalse();
            expect(component.finalSubmissionSent).toBeTrue();
            expect(component.submissionResult).toEqual({ score: 2, total: 2 });
        }));
        
        it('should handle error on submitAttempt', fakeAsync(() => {
            const errorResponse = { error: { message: 'Error en el servidor' } };
            quizService.submitAttempt.and.returnValue(throwError(() => errorResponse));
            spyOn(console, 'error');
            
            component.submitFullQuiz();
            tick();
            
            expect(quizService.submitAttempt).toHaveBeenCalled();
            expect(component.isSubmittingQuiz).toBeFalse();
            expect(component.finalSubmissionSent).toBeFalse();
            expect(component.errorSubmitting).toBe('Error en el servidor');
            expect(component.quizFlowCompleted).toBeFalse();
            expect(console.error).toHaveBeenCalledWith('Error submitting quiz:', errorResponse);
        }));
        
        it('should not submit if already submitting or submission sent', () => {
            component.isSubmittingQuiz = true;
            component.submitFullQuiz();
            expect(quizService.submitAttempt).not.toHaveBeenCalled();
            
            component.isSubmittingQuiz = false;
            component.finalSubmissionSent = true;
            quizService.submitAttempt.calls.reset();
            component.submitFullQuiz();
            expect(quizService.submitAttempt).not.toHaveBeenCalled();
        });
    });
    
    describe('closeModalAndEmit', () => {
        it('should emit quizClosed event', () => {
            spyOn(component.quizClosed, 'emit');
            component.closeModalAndEmit(true);
            expect(component.quizClosed.emit).toHaveBeenCalledWith(true);
            
            component.closeModalAndEmit(false);
            expect(component.quizClosed.emit).toHaveBeenCalledWith(false);
        });
    });
    
    describe('Template Interaction', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });
        
        it('should display the current question text', () => {
            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.querySelector('.question-text')?.textContent).toContain(mockQuizQuestion1.text);
        });
        
        it('should call selectOption when an option button is clicked', () => {
            spyOn(component, 'selectOption');
            const compiled = fixture.nativeElement as HTMLElement;
            const optionButton = compiled.querySelectorAll('.option-button')[0] as HTMLButtonElement;
            optionButton.click();
            expect(component.selectOption).toHaveBeenCalledWith(0);
        });
        
        it('confirm answer button should be disabled initially and enabled after selection', () => {
            const compiled = fixture.nativeElement as HTMLElement;
            let confirmButton = compiled.querySelector('.confirm-button') as HTMLButtonElement;
            expect(confirmButton.disabled).toBeTrue();
            
            component.selectOption(0);
            fixture.detectChanges();
            
            confirmButton = compiled.querySelector('.confirm-button') as HTMLButtonElement;
            expect(confirmButton.disabled).toBeFalse();
        });
        
        it('should show justification and feedback after confirming answer', () => {
            const compiled = fixture.nativeElement as HTMLElement;
            
            component.selectOption(1);
            component.confirmAnswer();
            fixture.detectChanges();
            
            expect(compiled.querySelector('.feedback-section')).toBeTruthy();
            expect(compiled.querySelector('.answer-feedback.correct-answer')).toBeTruthy();
            expect(compiled.querySelector('.justification p')?.textContent).toContain(mockQuizQuestion1.justification);
            expect(compiled.querySelector('.next-button')).toBeTruthy();
        });
    });
});