const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');
const Mission = require('../../models/Mission');
const UserMission = require('../../models/UserMission');

jest.mock('../../missions', () => ({
  test_mission: {
    type: 'test_mission',
    rewardXP: 15,
    generateParams: jest.fn().mockResolvedValue({ objective: 'test_objective', targetCount: 1 }),
    getDescription: jest.fn().mockResolvedValue('Achieve the test_objective'),
    onEvent: jest.fn((event, params) => {
      return Promise.resolve(event && event.type === 'TEST_EVENT' && event.payload && event.payload.data === params.objective);
    }),
  },
  another_test_mission: {
    type: 'another_test_mission',
    rewardXP: 25,
    generateParams: jest.fn().mockResolvedValue({ detail: 'another_detail', targetCount: 1 }),
    getDescription: jest.fn().mockResolvedValue('Complete another_detail task'),
    onEvent: jest.fn((event, params) => {
      return Promise.resolve(event && event.type === 'ANOTHER_TEST_EVENT' && event.payload && event.payload.info === params.detail);
    }),
  }
}));

describe('Mission Routes - Integration Tests', () => {
  let testUser;
  let accessToken;
  let missionDef1;
  let missionDef2;
  
  const testUserData = {
    username: 'missionRouteUser',
    email: 'missionroute@example.com',
    password: 'password123',
  };
  
  beforeAll(async () => {
    await User.deleteMany({});
    await Mission.deleteMany({});
    await UserMission.deleteMany({});
    
    await request(app).post('/api/auth/register').send(testUserData);
    const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: testUserData.email, password: testUserData.password });
    
    if (loginResponse.status !== 200 || !loginResponse.body.accessToken) {
      console.error('Test setup failed (mission.routes): Could not log in user.', loginResponse.body);
      throw new Error('Test setup failed (mission.routes): User login failed.');
    }
    accessToken = loginResponse.body.accessToken;
    testUser = loginResponse.body.user;
    
    missionDef1 = await Mission.create({
      type: 'test_mission',
      params: {},
      rewardXP: 15,
    });
    missionDef2 = await Mission.create({
      type: 'another_test_mission',
      params: {},
      rewardXP: 25,
    });
  });
  
  afterEach(async () => {
    await UserMission.deleteMany({});
  });
  
  afterAll(async () => {
    await User.deleteMany({});
    await Mission.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });
  
  describe('GET /api/missions/daily', () => {
    it('should assign 2 new daily missions if none exist for the user (default count)', async () => {
      const response = await request(app)
      .get('/api/missions/daily')
      .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      const expectedMissionsCount = Math.min(2, [missionDef1, missionDef2].filter(Boolean).length);
      expect(response.body.length).toBe(expectedMissionsCount); 
      
      if (expectedMissionsCount > 0) {
        expect(response.body[0]).toHaveProperty('userId', testUser.id.toString());
        expect(response.body.map(m => m.missionId)).toEqual(
          expect.arrayContaining([missionDef1._id.toString(), missionDef2._id.toString()])
        );
        
        const mission1Data = response.body.find(m => m.missionId === missionDef1._id.toString());
        const mission2Data = response.body.find(m => m.missionId === missionDef2._id.toString());
        
        expect(mission1Data.params).toEqual({ objective: 'test_objective', targetCount: 1 });
        expect(mission1Data.description).toBe('Achieve the test_objective');
        expect(mission2Data.params).toEqual({ detail: 'another_detail', targetCount: 1 });
        expect(mission2Data.description).toBe('Complete another_detail task');
      }
      
      const userMissionsInDb = await UserMission.find({ userId: testUser.id }).lean();
      expect(userMissionsInDb.length).toBe(expectedMissionsCount);
    });
    
    it('should return existing daily missions if they already exist', async () => {
      await request(app)
      .get('/api/missions/daily')
      .set('Authorization', `Bearer ${accessToken}`);
      
      const initialMissions = await UserMission.find({ userId: testUser.id }).lean();
      const countAfterFirstCall = initialMissions.length;
      
      // Segunda llamada
      const response = await request(app)
      .get('/api/missions/daily')
      .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(countAfterFirstCall);
      
      const userMissionsInDb = await UserMission.find({ userId: testUser.id }).lean();
      expect(userMissionsInDb.length).toBe(countAfterFirstCall);
    });
    
    it('should return 401 if no token is provided', async () => {
      const response = await request(app).get('/api/missions/daily');
      expect(response.status).toBe(401);
      expect(response.body.code).toEqual('NO_TOKEN');
    });
  });
  
  describe('POST /api/missions/:id/event', () => {
    it('should return 404 if user tries to handle event for another user\'s mission (or mission not found for user)', async () => {

      const otherUserId = new mongoose.Types.ObjectId();
      const otherUserMission = await UserMission.create({
        userId: otherUserId,
        missionId: missionDef1._id,
        params: { objective: 'test_objective', targetCount: 1 },
        description: 'Achieve the test_objective',
        date: new Date(),
        completed: false,
      });
      
      const eventPayload = { type: 'TEST_EVENT', payload: { data: 'test_objective', speciesId: 'test_objective' } };
      
      const response = await request(app)
      .post(`/api/missions/${otherUserMission._id}/event`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ event: eventPayload });
      
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Mission not found or not assigned to this user.' });
    });
    
    it('should return 400 if mission ID format is invalid', async () => {
      const eventPayload = { type: 'TEST_EVENT', payload: { data: 'test_objective', speciesId: 'test_objective' } };
      const response = await request(app)
      .post(`/api/missions/invalidMongoID/event`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ event: eventPayload });
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Invalid mission ID format.' });
    });
    
  });
});