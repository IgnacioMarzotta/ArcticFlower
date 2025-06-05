const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

describe('/api/auth Routes - Integration Tests', () => {
  const testUserCredentials = {
    username: 'integTestUser',
    email: 'integ@example.com',
    password: 'password123',
  };
  let createdUser;
  let authTokenForTests;
  let refreshTokenCookieForTests;
  
  beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
    }
  });
  
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully and return 201', async () => {
      const res = await request(app)
      .post('/api/auth/register')
      .send(testUserCredentials);
      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toEqual('User successfully created');
      const userInDb = await User.findOne({ email: testUserCredentials.email });
      expect(userInDb).not.toBeNull();
      expect(userInDb.username).toBe(testUserCredentials.username);
    });
    
    it('should return 400 if required fields are missing for registration', async () => {
      const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'badreg@example.com' });
      expect(res.statusCode).toEqual(400);
    });
    
    it('should return 409 if email already exists during registration', async () => {
      await User.create(testUserCredentials);
      const res = await request(app)
      .post('/api/auth/register')
      .send({ ...testUserCredentials, username: 'anotherUsername' });
      expect(res.statusCode).toEqual(409);
    });
  });
  
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const user = new User(testUserCredentials);
      await user.save();
    });
    
    it('should login an existing user and return accessToken and set refresh_token cookie', async () => {
      const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUserCredentials.email, password: testUserCredentials.password });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toEqual(testUserCredentials.email);
      
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.startsWith('refresh_token='))).toBe(true);
      expect(cookies.some(cookie => cookie.includes('HttpOnly'))).toBe(true);
    });
    
    it('should return 401 for invalid login credentials (wrong password)', async () => {
      const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUserCredentials.email, password: 'wrongpassword' });
      expect(res.statusCode).toEqual(401);
    });
  });
  
  describe('Authenticated Routes (/profile, /refresh, /logout)', () => {
    beforeEach(async () => {
      createdUser = new User({ ...testUserCredentials, email: `authroutes_${Date.now()}@example.com` });
      await createdUser.save();
      
      const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: createdUser.email, password: testUserCredentials.password });
      
      authTokenForTests = loginRes.body.accessToken;
      refreshTokenCookieForTests = loginRes.headers['set-cookie'].find(cookie => cookie.startsWith('refresh_token='));
    });
    
    describe('GET /api/auth/profile', () => {
      it('should return user profile for authenticated user', async () => {
        const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authTokenForTests}`);
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.username).toEqual(createdUser.username);
        expect(res.body.email).toEqual(createdUser.email);
      });
      
      it('should return 401 (TOKEN_EXPIRED) if access token is expired', async () => {
        const expiredAccessToken = jwt.sign(
          { userId: createdUser._id, permissions: createdUser.permissions }, 
          process.env.JWT_SECRET, 
          { expiresIn: '0s' }
        );
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredAccessToken}`);
        expect(res.statusCode).toEqual(401);
        expect(res.body.code).toEqual('TOKEN_EXPIRED');
      });
    });
    
    describe('POST /api/auth/refresh', () => {
      
      it('should return 401 if no refresh_token cookie is provided', async () => {
        const res = await request(app).post('/api/auth/refresh');
        expect(res.statusCode).toEqual(401);
        expect(res.body.code).toEqual('NO_REFRESH_TOKEN');
      });
      
      it('should return 403 if refresh_token is invalid/expired', async () => {
        const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'refresh_token=obviouslyInvalidToken123');
        expect(res.statusCode).toEqual(403);
        expect(res.body.code).toEqual('INVALID_REFRESH_TOKEN');
      });
    });
    
    describe('POST /api/auth/logout', () => {
      it('should clear refresh_token cookie and return 200', async () => {
        expect(refreshTokenCookieForTests).toBeDefined();
        
        const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', refreshTokenCookieForTests);
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toEqual('Successfully logged out');
        
        const cookies = res.headers['set-cookie'];
        expect(cookies).toBeDefined();
        const clearedCookie = cookies.find(c => c.startsWith('refresh_token='));
        expect(clearedCookie).toBeDefined();
        expect(clearedCookie).toMatch(/Max-Age=0|Expires=.*1970/);
      });
    });
  });
});