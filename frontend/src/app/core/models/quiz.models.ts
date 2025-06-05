export interface QuizQuestion {
  question_id: string;
  text: string;
  options: string[];
  justification: string;
  correct_option_index: number;
}

export interface ActiveQuizData {
  quiz_identifier: string;
  description?: string;
  version: number;
  questions: QuizQuestion[];
}

export interface UserQuizStatus {
  status: 'PENDING_ATTEMPT_1' | 'PENDING_ATTEMPT_2' | 'WAITING_FOR_ATTEMPT_2_WINDOW' | 'COMPLETED';
  message: string;
  quizIdentifier?: string;
  quizVersion?: number;
  attemptNumber?: number;
  nextAttemptAvailableAt?: string;
}

export interface UserAnswer {
  question_id: string;
  selected_option_index: number;
}

export interface QuizSubmission {
  quizIdentifier: string;
  quizVersion: number;
  attemptNumber: number;
  answers: UserAnswer[];
}

export interface QuizSubmissionResponse {
  message: string;
  attemptId: string;
  score: number;
  totalQuestions: number;
}