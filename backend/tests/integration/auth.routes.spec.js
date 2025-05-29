const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET; 
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'temp_refresh_secret'; 

describe('Auth Routes /api/auth', () => {
    let testUserCredentials;
    let testUser;
    let authToken;
    let agent;
    
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            try {
                await mongoose.connect(process.env.MONGO_URI_TEST);
            } catch (err) {
                console.error("Error connecting to MongoDB for auth.routes.spec.js", err);
                process.exit(1);
            }
        }
    });
    
    beforeEach(async () => {
        await User.deleteMany({});
        testUserCredentials = {
            username: 'testuser_int',
            email: 'testuser_int@example.com',
            password: 'Password123!',
        };
        agent = request.agent(app); 
    });
    
    afterAll(async () => {
        await User.deleteMany({});
        await mongoose.connection.close();
    });
    
    // --- POST /api/auth/register ---
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app)
            .post('/api/auth/register')
            .send(testUserCredentials);
            
            expect(res.statusCode).toBe(201);
            expect(res.body.message).toBe('User successfully created');
            
            const dbUser = await User.findOne({ email: testUserCredentials.email });
            expect(dbUser).toBeTruthy();
            expect(dbUser.username).toBe(testUserCredentials.username);
        });
        
        it('should fail if required fields are missing', async () => {
            const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'incomplete' });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('All fields are required');
        });
        
        it('should fail if username already exists', async () => {
            await User.create(testUserCredentials);
            const res = await request(app)
            .post('/api/auth/register')
            .send({ ...testUserCredentials, email: 'newemail@example.com' });
            expect(res.statusCode).toBe(409);
            expect(res.body.message).toBe('Username or email already registered');
        });
        
        it('should fail if email already exists', async () => {
            await User.create(testUserCredentials);
            const res = await request(app)
            .post('/api/auth/register')
            .send({ ...testUserCredentials, username: 'newusername' });
            expect(res.statusCode).toBe(409);
            expect(res.body.message).toBe('Username or email already registered');
        });
    });
    
    // --- POST /api/auth/login ---
    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            await request(app).post('/api/auth/register').send(testUserCredentials);
        });
        
        it('should login an existing user successfully and return a token', async () => {
            const res = await request(app)
            .post('/api/auth/login')
            .send({ email: testUserCredentials.email, password: testUserCredentials.password });
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('permissions');
            
            if (JWT_SECRET && JWT_SECRET !== '###################') {
                const decoded = jwt.verify(res.body.token, JWT_SECRET);
                const dbUser = await User.findOne({ email: testUserCredentials.email });
                expect(decoded.userId).toBe(dbUser._id.toString());
                expect(decoded.permissions).toBe(dbUser.permissions);
            }
        });
        
        it('should fail with invalid credentials if user not found', async () => {
            const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'nouser@example.com', password: 'somepassword' });
            expect(res.statusCode).toBe(401);
            expect(res.body.message).toBe('Invalid credentials, please try again.');
        });
        
        it('should fail with invalid credentials if password is incorrect', async () => {
            const res = await request(app)
            .post('/api/auth/login')
            .send({ email: testUserCredentials.email, password: 'WrongPassword123!' });
            expect(res.statusCode).toBe(401);
            expect(res.body.message).toBe('Invalid credentials, please try again.');
        });
    });
    
    // --- GET /api/auth/profile ---
    describe('GET /api/auth/profile', () => {
        beforeEach(async () => {
            await request(app).post('/api/auth/register').send(testUserCredentials);
            const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testUserCredentials.email, password: testUserCredentials.password });
            authToken = loginRes.body.token;
            testUser = await User.findOne({ email: testUserCredentials.email });
        });
        
        it('should get user profile with a valid token', async () => {
            const res = await request(app)
            .get('/api/auth/profile')
            .set('Authorization', `Bearer ${authToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.username).toBe(testUser.username);
            expect(res.body.email).toBe(testUser.email);
            expect(res.body).toHaveProperty('created_at');
        });
        
        it('should fail with 401 if no token is provided', async () => {
            const res = await request(app).get('/api/auth/profile');
            expect(res.statusCode).toBe(401);
            expect(res.body.message).toBe('No token provided');
        });
        
        it('should fail with 403 if token is invalid (malformed)', async () => {
            const res = await request(app)
            .get('/api/auth/profile')
            .set('Authorization', 'Bearer invalidtoken123');
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe('Failed to authenticate token');
        });
        
        it('should fail with 403 if token is expired or signature is wrong', async () => {
            const badToken = jwt.sign({ userId: testUser._id }, 'wrongsecret', { expiresIn: '1s' });
            
            const res = await request(app)
            .get('/api/auth/profile')
            .set('Authorization', `Bearer ${badToken}`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe('Failed to authenticate token');
        });
    });
    
    // --- POST /api/auth/refresh ---
    describe('POST /api/auth/refresh', () => {
        let validRefreshToken;
        
        beforeEach(async () => {
            const registeredUser = await User.create(testUserCredentials);
            if (REFRESH_SECRET && REFRESH_SECRET !== 'temp_refresh_secret') {
                validRefreshToken = jwt.sign({ userId: registeredUser._id }, REFRESH_SECRET, { expiresIn: '14d' });
            } else {
                console.warn("REFRESH_SECRET is not properly set for /refresh tests. Skipping some assertions or tests.");
                validRefreshToken = null; 
            }
        });
        
        it('should refresh token successfully if valid refresh_token cookie is present', async () => {
            if (!validRefreshToken) {
                return pending("Skipping refresh test: REFRESH_SECRET not configured for test environment.");
            }
            const res = await agent
            .post('/api/auth/refresh')
            .set('Cookie', [`refresh_token=${validRefreshToken}`]);
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('accessToken');
            
            if (JWT_SECRET && JWT_SECRET !== '###################') {
                const decodedAccess = jwt.verify(res.body.accessToken, JWT_SECRET);
                const dbUser = await User.findOne({ email: testUserCredentials.email });
                expect(decodedAccess.userId).toBe(dbUser._id.toString());
            }
            
            const cookies = res.headers['set-cookie'];
            expect(cookies).toBeDefined();
            
            let newRefreshTokenCookie;
            if (Array.isArray(cookies)) {
                newRefreshTokenCookie = cookies.find(cookie => cookie.startsWith('refresh_token='));
            } else if (typeof cookies === 'string') {
                if (cookies.startsWith('refresh_token=')) {
                    newRefreshTokenCookie = cookies;
                }
            }
            
            expect(newRefreshTokenCookie).toBeDefined();
            expect(newRefreshTokenCookie).toMatch(/HttpOnly/i);
            expect(newRefreshTokenCookie).toMatch(/Secure/i);
            
            const newRefreshTokenValue = newRefreshTokenCookie.split(';')[0].split('=')[1];
            if (REFRESH_SECRET && REFRESH_SECRET !== 'your_test_refresh_secret_key_must_be_set') {
                const decodedRefresh = jwt.verify(newRefreshTokenValue, REFRESH_SECRET);
                const dbUser = await User.findOne({ email: testUserCredentials.email });
                expect(decodedRefresh.userId).toBe(dbUser._id.toString());
            }
        });
        
        it('should fail with 401 if no refresh_token cookie is provided', async () => {
            const res = await request(app)
            .post('/api/auth/refresh');
            expect(res.statusCode).toBe(401);
        });
        
        it('should fail with 401 if refresh_token is invalid', async () => {
            if (!REFRESH_SECRET || REFRESH_SECRET === 'temp_refresh_secret') {
                return pending("Skipping refresh test: REFRESH_SECRET not configured for test environment.");
            }
            const res = await agent
            .post('/api/auth/refresh')
            .set('Cookie', ['refresh_token=thisIsAnInvalidToken']);
            expect(res.statusCode).toBe(401);
        });
        
        it('should fail with 401 if refresh_token is valid but user does not exist', async () => {
            if (!REFRESH_SECRET || REFRESH_SECRET === 'temp_refresh_secret') {
                return pending("Skipping refresh test: REFRESH_SECRET not configured for test environment.");
            }
            const nonExistentUserId = new mongoose.Types.ObjectId().toString();
            const tokenForNonExistentUser = jwt.sign({ userId: nonExistentUserId }, REFRESH_SECRET, { expiresIn: '14d' });
            
            const res = await agent
            .post('/api/auth/refresh')
            .set('Cookie', [`refresh_token=${tokenForNonExistentUser}`]);
            expect(res.statusCode).toBe(401);
        });
    });
});