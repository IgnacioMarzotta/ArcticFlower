const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const UserQuizAttempt = require('../../models/UserQuizAttempt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const mockQuizFileData = {
    quiz_identifier: 'integration_test_quiz',
    description: 'Integration Test Quiz Description',
    version: 1,
    minTimeBetweenAttemptsMinutes: 5,
    questions: [
        { question_id: 'it_q1', text: 'Integration Q1?', options: ['A', 'B_Correct'], correct_option_index: 1, justification: 'J_IT_Q1' },
        { question_id: 'it_q2', text: 'Integration Q2?', options: ['X_Correct', 'Y'], correct_option_index: 0, justification: 'J_IT_Q2' },
    ],
};

jest.mock('../../services/quizFile.service', () => {
    return {
        getQuizData: jest.fn(() => Promise.resolve(mockQuizFileData))
    };
});

describe('/api/quizzes Routes - Integration Tests', () => {
    let testUser;
    let authToken;
    
    beforeAll(async () => { 
    });
    
    beforeEach(async () => {
        if (mongoose.connection.readyState === 1) {
            await User.deleteMany({});
            await UserQuizAttempt.deleteMany({});
        } else {
        }
        
        const userPayload = {
            username: `testuser_${Date.now()}`,
            email: `test_${Date.now()}@example.com`,
            password: 'password123',
            permissions: 1
        };
        testUser = new User(userPayload);
        await testUser.save();
        
        authToken = jwt.sign(
            { userId: testUser._id.toString(), permissions: testUser.permissions },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
    });
    
    afterAll(async () => {
    });
    
    
    describe('GET /api/quizzes/active', () => {
        it('should return 401 if no token is provided', async () => {
            const res = await request(app).get('/api/quizzes/active');
            expect(res.statusCode).toEqual(401);
            expect(res.body.code).toEqual('NO_TOKEN');
        });
        
        it('should return quiz data for authenticated user', async () => {
            const res = await request(app)
            .get('/api/quizzes/active')
            .set('Authorization', `Bearer ${authToken}`);
            
            expect(res.statusCode).toEqual(200);
            expect(res.body.quiz_identifier).toEqual(mockQuizFileData.quiz_identifier);
            expect(res.body.description).toEqual(mockQuizFileData.description);
            expect(res.body.version).toEqual(mockQuizFileData.version);
            expect(res.body.questions).toBeInstanceOf(Array);
            expect(res.body.questions.length).toEqual(mockQuizFileData.questions.length);
            expect(res.body.questions[0].correct_option_index).toBeDefined(); 
            expect(res.body.questions[0].justification).toBeDefined();
        });
    });
    
    describe('GET /api/quizzes/status', () => {
        it('should return PENDING_ATTEMPT_1 for a new user', async () => {
            const res = await request(app)
            .get('/api/quizzes/status')
            .set('Authorization', `Bearer ${authToken}`);
            
            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toEqual('PENDING_ATTEMPT_1');
            expect(res.body.quizIdentifier).toEqual(mockQuizFileData.quiz_identifier);
            expect(res.body.attemptNumber).toEqual(1);
        });
        
        it('should return WAITING_FOR_ATTEMPT_2_WINDOW after first attempt within time limit', async () => {
            await new UserQuizAttempt({
                user: testUser._id,
                quiz_identifier: mockQuizFileData.quiz_identifier,
                quiz_version_at_attempt: mockQuizFileData.version,
                attempt_number: 1,
                answers: [{ question_id: 'it_q1', selected_option_index: 0, is_correct: false }],
                score: 0,
                total_questions_at_attempt: mockQuizFileData.questions.length,
                createdAt: new Date(Date.now() - 2 * 60 * 1000)
            }).save();
            
            const res = await request(app)
            .get('/api/quizzes/status')
            .set('Authorization', `Bearer ${authToken}`);
            
            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toEqual('WAITING_FOR_ATTEMPT_2_WINDOW');
        });
        
        it('should return PENDING_ATTEMPT_2 after first attempt and time limit passed', async () => {
            await new UserQuizAttempt({
                user: testUser._id,
                quiz_identifier: mockQuizFileData.quiz_identifier,
                quiz_version_at_attempt: mockQuizFileData.version,
                attempt_number: 1,
                answers: [{ question_id: 'it_q1', selected_option_index: 0, is_correct: false }],
                score: 0,
                total_questions_at_attempt: mockQuizFileData.questions.length,
                createdAt: new Date(Date.now() - (mockQuizFileData.minTimeBetweenAttemptsMinutes + 1) * 60 * 1000)
            }).save();
            
            const res = await request(app)
            .get('/api/quizzes/status')
            .set('Authorization', `Bearer ${authToken}`);
            
            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toEqual('PENDING_ATTEMPT_2');
            expect(res.body.attemptNumber).toEqual(2);
        });
    });
    
    describe('POST /api/quizzes/submit', () => {
        it('should successfully submit an attempt', async () => {
            const attemptData = {
                quizIdentifier: mockQuizFileData.quiz_identifier,
                quizVersion: mockQuizFileData.version,
                attemptNumber: 1,
                answers: [
                    { question_id: 'it_q1', selected_option_index: 1 },
                    { question_id: 'it_q2', selected_option_index: 0 }
                ],
            };
            
            const res = await request(app)
            .post('/api/quizzes/submit')
            .set('Authorization', `Bearer ${authToken}`)
            .send(attemptData);
            
            expect(res.statusCode).toEqual(201);
            expect(res.body.message).toEqual('Intento enviado con éxito.');
            expect(res.body.score).toEqual(2);
            expect(res.body.totalQuestions).toEqual(mockQuizFileData.questions.length);
            
            const dbAttempt = await UserQuizAttempt.findById(res.body.attemptId);
            expect(dbAttempt).not.toBeNull();
            expect(dbAttempt.user.toString()).toEqual(testUser._id.toString());
            expect(dbAttempt.score).toEqual(2);
        });
        
        it('should return 400 for invalid submission data', async () => {
            const res = await request(app)
            .post('/api/quizzes/submit')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ quizIdentifier: 'test' });
            
            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toEqual('Datos de envío inválidos.');
        });
        
        it('should return 409 if version mismatch', async () => {
            const attemptData = {
                quizIdentifier: mockQuizFileData.quiz_identifier,
                quizVersion: mockQuizFileData.version + 1,
                attemptNumber: 1,
                answers: [{ question_id: 'it_q1', selected_option_index: 1 }],
            };
            const res = await request(app)
            .post('/api/quizzes/submit')
            .set('Authorization', `Bearer ${authToken}`)
            .send(attemptData);
            
            expect(res.statusCode).toEqual(409);
            expect(res.body.message).toContain('La versión del cuestionario ha cambiado');
        });
        
        it('should return 409 for duplicate attempt', async () => {
            const attemptData = {
                quizIdentifier: mockQuizFileData.quiz_identifier,
                quizVersion: mockQuizFileData.version,
                attemptNumber: 1,
                answers: [{ question_id: 'it_q1', selected_option_index: 1 }],
            };
            
            await request(app)
            .post('/api/quizzes/submit')
            .set('Authorization', `Bearer ${authToken}`)
            .send(attemptData);
            
            const res = await request(app)
            .post('/api/quizzes/submit')
            .set('Authorization', `Bearer ${authToken}`)
            .send(attemptData);
            
            expect(res.statusCode).toEqual(409);
            expect(res.body.message).toEqual('Este intento de cuestionario ya ha sido enviado.');
        });
    });
});