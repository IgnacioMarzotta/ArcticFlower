const { register, login, getProfile, refresh } = require('../../controllers/user.controller');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../../models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const originalEnv = process.env;

afterAll(() => {
    process.env = originalEnv;
});


describe('User Controller - Unit Tests', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockReq = {
            body: {},
            userId: null,
            cookies: {},
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            cookie: jest.fn().mockReturnThis(),
            end: jest.fn().mockReturnThis(),
        };
        // Reset mocks for each test
        User.findOne.mockReset();
        User.findById.mockReset();
        User.prototype.save.mockReset();
        bcrypt.compare.mockReset();
        jwt.sign.mockReset();
        jwt.verify.mockReset();
    });

    describe('register', () => {
        it('should register a new user successfully', async () => {
            mockReq.body = { username: 'newUser', email: 'new@example.com', password: 'password123' };
            User.findOne.mockResolvedValue(null);
            User.prototype.save.mockResolvedValue(true);

            await register(mockReq, mockRes);

            expect(User.findOne).toHaveBeenCalledWith({ $or: [{ username: 'newUser' }, { email: 'new@example.com' }] });
            expect(User.prototype.save).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'User successfully created' });
        });

        it('should return 400 if required fields are missing', async () => {
            mockReq.body = { username: 'test' };
            await register(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'All fields are required' });
        });

        it('should return 409 if username or email already exists', async () => {
            mockReq.body = { username: 'existingUser', email: 'existing@example.com', password: 'password123' };
            User.findOne.mockResolvedValue({ username: 'existingUser' });

            await register(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(409);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Username or email already registered' });
        });

        it('should return 500 on database error during save', async () => {
            mockReq.body = { username: 'newUser', email: 'new@example.com', password: 'password123' };
            User.findOne.mockResolvedValue(null);
            const dbError = new Error('Database save error');
            User.prototype.save.mockRejectedValue(dbError);

            await register(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Internal server error', error: dbError.message });
        });
    });

    describe('login', () => {
        const mockUser = {
            _id: 'userId123',
            email: 'test@example.com',
            password: 'hashedPassword',
            permissions: 0,
        };

        it('should login a user successfully and return a token', async () => {
            mockReq.body = { email: 'test@example.com', password: 'password123' };
            User.findOne.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('mockAuthToken');

            await login(mockReq, mockRes);

            expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
            expect(jwt.sign).toHaveBeenCalledWith(
                { userId: mockUser._id, permissions: mockUser.permissions },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            expect(mockRes.json).toHaveBeenCalledWith({ token: 'mockAuthToken', permissions: mockUser.permissions });
        });

        it('should return 401 if user not found', async () => {
            mockReq.body = { email: 'nonexistent@example.com', password: 'password123' };
            User.findOne.mockResolvedValue(null);

            await login(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid credentials, please try again.' });
        });

        it('should return 401 if password does not match', async () => {
            mockReq.body = { email: 'test@example.com', password: 'wrongPassword' };
            User.findOne.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);

            await login(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid credentials, please try again.' });
        });
         it('should return 500 on bcrypt error', async () => {
            mockReq.body = { email: 'test@example.com', password: 'password123' };
            User.findOne.mockResolvedValue(mockUser);
            const bcryptError = new Error('bcrypt error');
            bcrypt.compare.mockRejectedValue(bcryptError);

            await login(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Internal server error', error: bcryptError.message });
        });
    });

    describe('getProfile', () => {
        it('should return user profile if user is found', async () => {
            mockReq.userId = 'userId123';
            const mockProfile = { username: 'profileUser', email: 'profile@example.com', createdAt: new Date() };
            User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockProfile) });

            await getProfile(mockReq, mockRes);

            expect(User.findById).toHaveBeenCalledWith('userId123');
            expect(User.findById().select).toHaveBeenCalledWith('username email createdAt');
            expect(mockRes.json).toHaveBeenCalledWith({
                username: mockProfile.username,
                email: mockProfile.email,
                created_at: mockProfile.createdAt
            });
        });

        it('should return 404 if user not found', async () => {
            mockReq.userId = 'nonExistentUserId';
            User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

            await getProfile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found' });
        });
    });

    describe('refresh', () => {
        const mockUserFromToken = { _id: 'userIdFromToken', permissions: 0 };
        
        it('should refresh tokens successfully', async () => {
            mockReq.cookies = { 'refresh_token': 'validRefreshToken' };
            jwt.verify.mockReturnValue({ userId: mockUserFromToken._id });
            User.findById.mockResolvedValue(mockUserFromToken);
            jwt.sign
                .mockImplementationOnce((payload, secret, options) => 'newAccessToken')
                .mockImplementationOnce((payload, secret, options) => 'newRefreshToken');

            await refresh(mockReq, mockRes);

            expect(jwt.verify).toHaveBeenCalledWith('validRefreshToken', process.env.REFRESH_SECRET);
            expect(User.findById).toHaveBeenCalledWith(mockUserFromToken._id);
            expect(jwt.sign).toHaveBeenCalledWith(
                { userId: mockUserFromToken._id, permissions: mockUserFromToken.permissions },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );
            expect(jwt.sign).toHaveBeenCalledWith(
                { userId: mockUserFromToken._id },
                process.env.REFRESH_SECRET,
                { expiresIn: '14d' }
            );
            expect(mockRes.cookie).toHaveBeenCalledWith('refresh_token', 'newRefreshToken', { httpOnly: true, secure: true });
            expect(mockRes.json).toHaveBeenCalledWith({ accessToken: 'newAccessToken' });
        });

        it('should return 401 if no refresh token in cookie', async () => {
            mockReq.cookies = {};
            await refresh(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.end).toHaveBeenCalled();
        });

        it('should return 401 if refresh token verification fails', async () => {
            mockReq.cookies = { 'refresh_token': 'invalidRefreshToken' };
            jwt.verify.mockImplementation(() => { throw new Error('Verification failed'); });

            await refresh(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.end).toHaveBeenCalled();
        });

        it('should return 401 if user from token payload not found', async () => {
            mockReq.cookies = { 'refresh_token': 'validRefreshTokenForNonExistentUser' };
            jwt.verify.mockReturnValue({ userId: 'nonExistentUserId' });
            User.findById.mockResolvedValue(null);

            await refresh(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.end).toHaveBeenCalled();
        });
    });
});