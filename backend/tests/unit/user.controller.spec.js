const userController = require('../../controllers/user.controller');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../../models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('User Controller - Unit Tests', () => {
  let mockReq;
  let mockRes;
  
  beforeEach(() => {
    mockReq = {
      body: {},
      headers: {},
      cookies: {},
      userId: 'testUserIdFromToken123',
      userPermissions: 0,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    
    User.findOne.mockReset();
    User.findById.mockReset();
    const mockSave = jest.fn().mockResolvedValue(true);
    User.mockImplementation(() => ({ save: mockSave }));
    if (User.prototype.save && typeof User.prototype.save.mockReset === 'function') {
      User.prototype.save.mockReset();
    } else if (typeof mockSave.mockReset === 'function') {
      mockSave.mockReset();
    }
    
    
    bcrypt.compare.mockReset();
    jwt.sign.mockReset();
    jwt.verify.mockReset();
  });
  
  describe('register', () => {
    it('should return 400 if required fields are missing', async () => {
      mockReq.body = { email: 'test@test.com', password: '123' };
      await userController.register(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'All fields are required' });
    });
    
    it('should return 409 if username or email already exists', async () => {
      mockReq.body = { username: 'test', email: 'test@test.com', password: '123' };
      User.findOne.mockResolvedValue({ _id: 'someId' });
      await userController.register(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Username or email already registered' });
    });
    
    it('should create a new user successfully', async () => {
      mockReq.body = { username: 'newUser', email: 'new@test.com', password: 'password123' };
      User.findOne.mockResolvedValue(null);
      const specificMockSave = jest.fn().mockResolvedValue(true);
      User.mockImplementation(() => ({
        username: mockReq.body.username,
        email: mockReq.body.email,
        password: mockReq.body.password,
        save: specificMockSave
      }));
      
      
      await userController.register(mockReq, mockRes);
      
      expect(specificMockSave).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'User successfully created' });
    });
    
    it('should return 500 on server error during registration', async () => {
      mockReq.body = { username: 'test', email: 'test@test.com', password: '123' };
      User.findOne.mockRejectedValue(new Error('DB error'));
      await userController.register(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Internal server error' }));
    });
  });
  
  describe('login', () => {
    const mockUser = {
      _id: 'userId123',
      username: 'testuser',
      email: 'test@test.com',
      password: 'hashedPasswordFromDB',
      permissions: 0,
    };
    
    it('should return 401 if user not found', async () => {
      mockReq.body = { email: 'unknown@test.com', password: '123' };
      User.findOne.mockResolvedValue(null);
      await userController.login(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
    
    it('should return 401 if password is a mismatch', async () => {
      mockReq.body = { email: mockUser.email, password: 'wrongPassword' };
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);
      await userController.login(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
    
    it('should login successfully and return tokens and user data', async () => {
      mockReq.body = { email: mockUser.email, password: 'password123' };
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign
      .mockReturnValueOnce('mockAccessTokenGenerated')
      .mockReturnValueOnce('mockRefreshTokenGenerated');
      
      await userController.login(mockReq, mockRes);
      
      expect(jwt.sign).toHaveBeenNthCalledWith(1,
        { userId: mockUser._id, permissions: mockUser.permissions },
        process.env.JWT_SECRET,
        { expiresIn: '12h' }
      );
      expect(jwt.sign).toHaveBeenNthCalledWith(2,
        { userId: mockUser._id },
        process.env.REFRESH_SECRET,
        { expiresIn: '7d' }
      );
      expect(mockRes.cookie).toHaveBeenCalledWith('refresh_token', 'mockRefreshTokenGenerated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        accessToken: 'mockAccessTokenGenerated',
        user: {
          id: mockUser._id,
          username: mockUser.username,
          email: mockUser.email,
          permissions: mockUser.permissions,
        },
      });
    });
  });
  
  describe('getProfile', () => {
    it('should return user profile if token is valid', async () => {
      const profileData = { username: 'profileUser', email: 'profile@test.com', createdAt: new Date(), permissions: 0 };
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(profileData) });
      mockReq.userId = 'aValidUserId'; 
      
      await userController.getProfile(mockReq, mockRes);
      
      expect(User.findById).toHaveBeenCalledWith('aValidUserId');
      expect(User.findById().select).toHaveBeenCalledWith('username email createdAt permissions');
      expect(mockRes.json).toHaveBeenCalledWith({
        username: profileData.username,
        email: profileData.email,
        created_at: profileData.createdAt,
        permissions: profileData.permissions,
      });
    });
    
    it('should return 404 if user not found for profile', async () => {
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
      mockReq.userId = 'aValidUserId';
      await userController.getProfile(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
  
  describe('refresh', () => {
    const mockUserForRefresh = { _id: 'refUserId', permissions: 1 };
    
    it('should return 401 if no refresh token cookie', async () => {
      mockReq.cookies = {};
      await userController.refresh(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'No refresh token provided', code: 'NO_REFRESH_TOKEN' });
    });
    
    it('should return 403 if refresh token verification fails', async () => {
      mockReq.cookies = { refresh_token: 'badToken' };
      jwt.verify.mockImplementation(() => { throw new Error('Verification failed'); });
      await userController.refresh(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN' });
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));
    });
    
    it('should return 403 if user not found for valid refresh token payload', async () => {
      mockReq.cookies = { refresh_token: 'validStructToken' };
      jwt.verify.mockReturnValue({ userId: 'someUserIdInToken' });
      User.findById.mockResolvedValue(null); // Usuario no encontrado en BD
      await userController.refresh(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found for refresh token', code: 'USER_NOT_FOUND' });
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));
    });
    
    it('should successfully refresh tokens', async () => {
      mockReq.cookies = { refresh_token: 'goodOldRefreshToken' };
      jwt.verify.mockReturnValue({ userId: mockUserForRefresh._id });
      User.findById.mockResolvedValue(mockUserForRefresh);
      jwt.sign
      .mockReturnValueOnce('newAccessTokenRefreshed')
      .mockReturnValueOnce('newRefreshTokenRefreshed');
      
      await userController.refresh(mockReq, mockRes);
      
      expect(jwt.verify).toHaveBeenCalledWith('goodOldRefreshToken', process.env.REFRESH_SECRET);
      expect(User.findById).toHaveBeenCalledWith(mockUserForRefresh._id);
      expect(jwt.sign).toHaveBeenNthCalledWith(1, { userId: mockUserForRefresh._id, permissions: mockUserForRefresh.permissions }, process.env.JWT_SECRET, { expiresIn: '12h' });
      expect(jwt.sign).toHaveBeenNthCalledWith(2, { userId: mockUserForRefresh._id }, process.env.REFRESH_SECRET, { expiresIn: '7d' });
      expect(mockRes.cookie).toHaveBeenCalledWith('refresh_token', 'newRefreshTokenRefreshed', expect.any(Object));
      expect(mockRes.json).toHaveBeenCalledWith({ accessToken: 'newAccessTokenRefreshed' });
    });
  });
  
  describe('logout', () => {
    it('should clear refresh_token cookie and return 200', () => {
      userController.logout(mockReq, mockRes);
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Successfully logged out' });
    });
  });
});