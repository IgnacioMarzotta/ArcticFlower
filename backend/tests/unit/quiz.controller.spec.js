const { getActiveQuizForUser, getUserQuizStatus, submitUserAttempt } = require('../../controllers/quiz.controller');
const UserQuizAttempt = require('../../models/UserQuizAttempt');
const quizFileService = require('../../services/quizFile.service');

jest.mock('../../services/quizFile.service');
jest.mock('../../models/UserQuizAttempt');

const mockQuestionsJsonData = {
    quiz_identifier: 'unit_test_quiz',
    description: 'Unit Test Quiz Description',
    version: 1,
    minTimeBetweenAttemptsMinutes: 10,
    questions: [
        { question_id: 'q1', text: 'Q1?', options: ['A', 'B_Correct'], correct_option_index: 1, justification: 'J1' },
        { question_id: 'q2', text: 'Q2?', options: ['X_Correct', 'Y'], correct_option_index: 0, justification: 'J2' },
    ],
};

describe('Quiz Controller - Unit Tests', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    
    beforeEach(() => {
        quizFileService.getQuizData.mockReset();
        UserQuizAttempt.findOne.mockReset();
        if (UserQuizAttempt.prototype.save) {
            UserQuizAttempt.prototype.save.mockReset();
        } else { }
        
        
        mockReq = {
            userId: 'testUserId123',
            body: {},
            params: {},
            query: {},
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
    });
    
    describe('getActiveQuizForUser', () => {
        it('should return quiz data WITH correct_option_index', async () => {
            quizFileService.getQuizData.mockResolvedValue(mockQuestionsJsonData);
            
            await getActiveQuizForUser(mockReq, mockRes, mockNext);
            
            expect(quizFileService.getQuizData).toHaveBeenCalledWith('questions.json');
            expect(mockRes.json).toHaveBeenCalledWith({
                quiz_identifier: mockQuestionsJsonData.quiz_identifier,
                description: mockQuestionsJsonData.description,
                version: mockQuestionsJsonData.version,
                questions: mockQuestionsJsonData.questions,
            });
        });
    });
    
    describe('getUserQuizStatus', () => {
        beforeEach(() => {
            quizFileService.getQuizData.mockResolvedValue(mockQuestionsJsonData);
        });
        
        it('should return PENDING_ATTEMPT_1 if no attempts found', async () => {
            UserQuizAttempt.findOne.mockResolvedValue(null);
            await getUserQuizStatus(mockReq, mockRes, mockNext);
            expect(UserQuizAttempt.findOne).toHaveBeenCalledTimes(1);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING_ATTEMPT_1' }));
        });
        
        it('should return PENDING_ATTEMPT_2 if attempt 1 done, time passed, no attempt 2', async () => {
            const tenMinAgo = Date.now() - (mockQuestionsJsonData.minTimeBetweenAttemptsMinutes + 1) * 60 * 1000;
            UserQuizAttempt.findOne
            .mockResolvedValueOnce({ createdAt: new Date(tenMinAgo) })
            .mockResolvedValueOnce(null);
            
            await getUserQuizStatus(mockReq, mockRes, mockNext);
            expect(UserQuizAttempt.findOne).toHaveBeenCalledTimes(2);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING_ATTEMPT_2' }));
        });
        
        it('should return WAITING_FOR_ATTEMPT_2_WINDOW if attempt 1 done, time NOT passed', async () => {
            const fiveMinAgo = Date.now() - 5 * 60 * 1000; 
            UserQuizAttempt.findOne
            .mockResolvedValueOnce({ createdAt: new Date(fiveMinAgo) }) 
            .mockResolvedValueOnce(null); 
            
            await getUserQuizStatus(mockReq, mockRes, mockNext);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'WAITING_FOR_ATTEMPT_2_WINDOW' }));
        });
        
        it('should return COMPLETED if both attempts done', async () => {
            UserQuizAttempt.findOne
            .mockResolvedValueOnce({ createdAt: new Date() }) 
            .mockResolvedValueOnce({ createdAt: new Date() }); 
            
            await getUserQuizStatus(mockReq, mockRes, mockNext);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'COMPLETED' }));
        });
    });
    
    describe('submitUserAttempt', () => {
        let mockSave;
        
        beforeEach(() => {
            quizFileService.getQuizData.mockResolvedValue(mockQuestionsJsonData);
            
            mockSave = jest.fn().mockImplementation(function() {
                return Promise.resolve({ 
                    ...this,
                    _id: 'mockAttemptId123'
                });
            });
            UserQuizAttempt.mockImplementation(() => ({
                save: mockSave
            }));
        });
        
        
        it('should successfully submit an attempt and use savedAttempt properties', async () => {
            mockReq.body = {
                quizIdentifier: mockQuestionsJsonData.quiz_identifier,
                quizVersion: mockQuestionsJsonData.version,
                attemptNumber: 1,
                answers: [{ question_id: 'q1', selected_option_index: 1 }],
            };
            
            const calculatedScoreForThisTest = 1;
            const totalQuestionsForThisTest = mockQuestionsJsonData.questions.length;
            mockSave.mockResolvedValue({
                _id: 'attemptIdReturnedBySave',
                user: mockReq.userId,
                quiz_identifier: mockReq.body.quizIdentifier,
                quiz_version_at_attempt: mockReq.body.quizVersion,
                attempt_number: mockReq.body.attemptNumber,
                answers: mockReq.body.answers.map(a => ({...a, is_correct: a.selected_option_index === 1})),
                score: calculatedScoreForThisTest,
                total_questions_at_attempt: totalQuestionsForThisTest
            });
            
            await submitUserAttempt(mockReq, mockRes, mockNext);
            
            expect(UserQuizAttempt).toHaveBeenCalledWith(expect.objectContaining({
                score: calculatedScoreForThisTest
            }));
            expect(mockSave).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Intento enviado con éxito.',
                attemptId: 'attemptIdReturnedBySave',
                score: calculatedScoreForThisTest,
                totalQuestions: totalQuestionsForThisTest
            });
        });
        
        it('should return 400 if body is invalid', async () => {
            mockReq.body = { quizIdentifier: 'test' };
            await submitUserAttempt(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Datos de envío inválidos.' });
        });
        
        it('should return 409 if version mismatch', async () => {
            mockReq.body = {
                quizIdentifier: mockQuestionsJsonData.quiz_identifier,
                quizVersion: mockQuestionsJsonData.version + 1,
                attemptNumber: 1,
                answers: [{ question_id: 'q1', selected_option_index: 0 }],
            };
            await submitUserAttempt(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(409);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('La versión del cuestionario ha cambiado'),
            }));
        });
        
        it('should return 400 if an invalid question_id is submitted', async () => {
            mockReq.body = {
                quizIdentifier: mockQuestionsJsonData.quiz_identifier,
                quizVersion: mockQuestionsJsonData.version,
                attemptNumber: 1,
                answers: [{ question_id: 'invalid_q_id', selected_option_index: 0 }],
            };
            await submitUserAttempt(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'ID de pregunta inválido: invalid_q_id' });
        });
        
        it('should return 409 if attempt is a duplicate (save throws 11000)', async () => {
            mockReq.body = { 
                quizIdentifier: mockQuestionsJsonData.quiz_identifier,
                quizVersion: mockQuestionsJsonData.version,
                attemptNumber: 1,
                answers: [{ question_id: 'q1', selected_option_index: 0 }],
            };
            const duplicateError = new Error('Duplicate key');
            duplicateError.code = 11000;
            mockSave.mockRejectedValue(duplicateError);
            
            await submitUserAttempt(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(409);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Este intento de cuestionario ya ha sido enviado.' });
        });
    });
});