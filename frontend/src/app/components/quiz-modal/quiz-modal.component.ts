// frontend/src/app/components/quiz-modal/quiz-modal.component.ts
import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActiveQuizData, QuizQuestion, UserAnswer, QuizSubmission, QuizSubmissionResponse } from '../../core/models/quiz.models';
import { QuizService } from '../../core/services/quiz.service';

interface DisplayQuestion extends QuizQuestion {
  user_selected_option_index?: number;
  answered?: boolean;
  user_was_correct?: boolean;
}

@Component({
  selector: 'app-quiz-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quiz-modal.component.html',
  styleUrls: ['./quiz-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizModalComponent implements OnInit {
  @Input() quizData!: ActiveQuizData;
  @Input() attemptNumber!: number;
  @Output() quizClosed = new EventEmitter<boolean>();
  
  displayQuestions: DisplayQuestion[] = [];
  currentQuestionIndex: number = 0;
  userAnswersInternal: UserAnswer[] = [];
  quizFlowCompleted: boolean = false;
  finalSubmissionSent: boolean = false;
  showFeedbackForCurrent: boolean = false;
  submissionResult: { score: number, total: number } | null = null;
  isSubmittingQuiz: boolean = false;
  errorSubmitting: string | null = null;
  
  constructor(
    private quizService: QuizService,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    if (this.quizData && this.quizData.questions) {
      this.displayQuestions = this.quizData.questions.map(q => ({
        ...q,
        answered: false,
      }));
      if (this.displayQuestions.length === 0) {
        console.warn("QuizModal: No questions received in quizData.");
        this.closeModalAndEmit(false); 
      }
    } else {
      console.error("QuizModal: quizData is not properly initialized.");
      this.closeModalAndEmit(false); 
    }
  }
  
  get currentQuestion(): DisplayQuestion | undefined {
    return this.displayQuestions[this.currentQuestionIndex];
  }
  
  selectOption(optionIndex: number): void {
    const cq = this.currentQuestion;
    if (cq && !cq.answered) {
      cq.user_selected_option_index = optionIndex;
      this.cdr.markForCheck();
    }
  }
  
  confirmAnswer(): void {
    const cq = this.currentQuestion;
    if (cq && cq.user_selected_option_index !== undefined && !cq.answered) {
      cq.answered = true;
      cq.user_was_correct = cq.user_selected_option_index === cq.correct_option_index;
      this.showFeedbackForCurrent = true;
      
      this.userAnswersInternal.push({
        question_id: cq.question_id,
        selected_option_index: cq.user_selected_option_index
      });
      this.cdr.markForCheck();
    }
  }
  
  proceedToNext(): void {
    this.showFeedbackForCurrent = false; 
    if (this.currentQuestionIndex < this.displayQuestions.length - 1) {
      this.currentQuestionIndex++;
    } else {
      this.quizFlowCompleted = true;
      this.submitFullQuiz();
    }
    this.cdr.markForCheck();
  }
  
  submitFullQuiz(): void {
    if (this.isSubmittingQuiz || this.finalSubmissionSent) return;
    this.isSubmittingQuiz = true;
    this.errorSubmitting = null;
    this.cdr.markForCheck();
    
    const submission: QuizSubmission = {
      quizIdentifier: this.quizData.quiz_identifier,
      quizVersion: this.quizData.version,
      attemptNumber: this.attemptNumber,
      answers: this.userAnswersInternal
    };
    
    this.quizService.submitAttempt(submission).subscribe({
      next: (response: QuizSubmissionResponse) => {
        this.submissionResult = { score: response.score, total: response.totalQuestions };
        this.finalSubmissionSent = true;
        this.isSubmittingQuiz = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error submitting quiz:', err);
        this.errorSubmitting = err.error?.message || 'Fallo al enviar el cuestionario. Intenta de nuevo.';
        this.isSubmittingQuiz = false;
        this.quizFlowCompleted = false; 
        this.cdr.markForCheck();
      }
    });
  }
  
  closeModalAndEmit(submittedSuccessfully: boolean): void {
    this.quizClosed.emit(submittedSuccessfully);
  }
}