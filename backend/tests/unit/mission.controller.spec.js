const missionController = require('../../controllers/mission.controller');
const Mission = require('../../models/Mission');
const UserMission = require('../../models/UserMission');
const User = require('../../models/User');
const missionTemplates = require('../../missions');

jest.mock('../../models/Mission');
jest.mock('../../models/UserMission');
jest.mock('../../models/User');
jest.mock('../../missions', () => ({
    visit_cr_species: {
        type: 'visit_cr_species',
        generateParams: jest.fn(),
        getDescription: jest.fn(),
        onEvent: jest.fn(),
    },
    another_mission_type: {
        type: 'another_mission_type',
        generateParams: jest.fn().mockResolvedValue({ param: 'default', targetCount: 1 }),
        getDescription: jest.fn().mockResolvedValue('Default description'),
        onEvent: jest.fn().mockResolvedValue(false),
    }
}));

describe('Mission Controller - Unit Tests', () => {
    let mockReq, mockRes;
    
    beforeEach(() => {
        mockReq = {
            userId: 'testUserId',
            params: {},
            body: {},
        };
        mockRes = {
            json: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });
    
    describe('assignMissionsToUser', () => {
        it('should assign up to 2 missions to a user successfully', async () => {
            const mockMissionDefs = [
                { _id: 'missionDef1', type: 'visit_cr_species', params: { p1: 'v1' }, rewardXP: 10 },
                { _id: 'missionDef2', type: 'another_mission_type', params: { p2: 'v2' }, rewardXP: 20 },
            ];
            Mission.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockMissionDefs)
            });
            
            missionTemplates.visit_cr_species.generateParams.mockResolvedValue({ country: 'CL', targetCount: 1 });
            missionTemplates.visit_cr_species.getDescription.mockResolvedValue('Visit a CR species in CL');
            missionTemplates.another_mission_type.generateParams.mockResolvedValue({ city: 'NY', targetCount: 1});
            missionTemplates.another_mission_type.getDescription.mockResolvedValue('Visit another type in NY');
            
            UserMission.insertMany.mockResolvedValue([{ _id: 'um1' }, { _id: 'um2' }]);
            
            const assignedMissions = await missionController.assignMissionsToUser('testUserId', 2);
            
            
            expect(Mission.find).toHaveBeenCalledTimes(1);
            expect(UserMission.insertMany).toHaveBeenCalledTimes(1);

            expect(Mission.find().lean).toHaveBeenCalledTimes(1);
            expect(UserMission.insertMany.mock.calls[0][0].length).toBeLessThanOrEqual(2);
            if (UserMission.insertMany.mock.calls[0][0].length > 0) {
                expect(UserMission.insertMany.mock.calls[0][0][0]).toMatchObject({
                    userId: 'testUserId',
                });
            }

            expect(assignedMissions.length).toBeLessThanOrEqual(2);
        });
        
        it('should assign default 2 missions if count is not provided', async () => {
            const mockMissionDefs = [
                { _id: 'm1', type: 'visit_cr_species' }, { _id: 'm2', type: 'another_mission_type'}, { _id: 'm3', type: 'another_mission_type'}
            ];
            Mission.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockMissionDefs)
            });
            missionTemplates.visit_cr_species.generateParams.mockResolvedValue({ country: 'AR', targetCount: 1 });
            missionTemplates.visit_cr_species.getDescription.mockResolvedValue('Desc AR');
            missionTemplates.another_mission_type.generateParams.mockResolvedValue({ city: 'LA', targetCount: 1 });
            missionTemplates.another_mission_type.getDescription.mockResolvedValue('Desc LA');
            
            UserMission.insertMany.mockImplementation(docs => Promise.resolve(docs.map((d, i) => ({...d, _id: `um${i}`}))));
            
            const assignedMissions = await missionController.assignMissionsToUser('testUserId');
            
            expect(Mission.find).toHaveBeenCalledTimes(1);
            expect(UserMission.insertMany).toHaveBeenCalledTimes(1);
            expect(UserMission.insertMany.mock.calls[0][0].length).toBe(2);
            expect(assignedMissions.length).toBe(2);
        });
        
        
        it('should handle no mission definitions found', async () => {
            Mission.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue([]) 
            });
            const assignedMissions = await missionController.assignMissionsToUser('testUserId', 2);
            expect(Mission.find).toHaveBeenCalledTimes(1);
            expect(Mission.find().lean).toHaveBeenCalledTimes(1);
            expect(UserMission.insertMany).not.toHaveBeenCalled();
            expect(assignedMissions).toEqual([]);
        });
        
        it('should skip invalid mission definitions or templates', async () => {
            const mockMissionDefs = [
                { _id: 'validDef1', type: 'visit_cr_species' },
                { _id: 'invalidDef1', type: 'non_existent_type' },
                null,
                { _id: 'validDef2', type: 'another_mission_type' },
            ];
            Mission.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockMissionDefs)
            });
            missionTemplates.visit_cr_species.generateParams.mockResolvedValue({ country: 'PE', targetCount: 1 });
            missionTemplates.visit_cr_species.getDescription.mockResolvedValue('Desc PE');
            missionTemplates.another_mission_type.generateParams.mockResolvedValue({ city: 'FL', targetCount: 1});
            missionTemplates.another_mission_type.getDescription.mockResolvedValue('Desc FL');
            
            UserMission.insertMany.mockImplementation(docs => Promise.resolve(docs.map((d, i) => ({...d, _id: `um${i}`}))));
            
            const assignedMissions = await missionController.assignMissionsToUser('testUserId', 4);
            
            expect(UserMission.insertMany).toHaveBeenCalledTimes(1);
            expect(UserMission.insertMany.mock.calls[0][0].length).toBe(2);
            expect(assignedMissions.length).toBe(2);
            expect(assignedMissions.map(m => m.missionId)).toEqual(expect.arrayContaining(['validDef1', 'validDef2']));
        });
        
        
        it('should handle error during generateParams', async () => {
            const mockMissionDefs = [{ _id: 'missionDef1', type: 'visit_cr_species' }];
            Mission.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockMissionDefs)
            });
            missionTemplates.visit_cr_species.generateParams.mockRejectedValue(new Error('GenParam failed'));
            
            const assigned = await missionController.assignMissionsToUser('testUserId', 1);
            expect(UserMission.insertMany).not.toHaveBeenCalled();
            expect(assigned).toEqual([]);
        });
    });
    
    describe('getDailyMissions', () => {
        let originalConsoleError;
        beforeEach(() => {
            originalConsoleError = console.error;
            console.error = jest.fn();
        });
        afterEach(() => {
            console.error = originalConsoleError;
        });
        
        it('should return 500 if assignMissionsToUser fails with a non-11000 error', async () => {
            UserMission.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([]) });
            
            const assignError = new Error('Other assignment error');
            const assignSpy = jest.spyOn(missionController, 'assignMissionsToUser').mockRejectedValue(assignError);
            
            await missionController.getDailyMissions(mockReq, mockRes);
            
            expect(console.error).toHaveBeenCalled();
            expect(assignSpy).toHaveBeenCalledTimes(1);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: '[mission.controller - getDailyMissions] An internal error occurred while assigning daily missions.',
                error: 'Other assignment error',
            });
            assignSpy.mockRestore();
        });
    });
    
    describe('handleEvent', () => {
        let mockUserMissionInstance;
        
        beforeEach(() => {
            mockReq.params.id = 'userMissionId1';
            mockReq.body.event = { type: 'SPECIES_VIEW', payload: { speciesId: 'sp1', status: 'CR', clusterId: 'CL' } };
            
            mockUserMissionInstance = {
                _id: 'userMissionId1',
                userId: 'testUserId',
                missionId: { _id: 'missionDefId1', type: 'visit_cr_species', rewardXP: 10 },
                params: { country: 'CL', targetCount: 1 },
                progress: { seen: [] },
                completed: false,
                save: jest.fn().mockImplementation(function() {
                    return Promise.resolve(this);
                }),
            };
            
            
            UserMission.findOne = jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockUserMissionInstance)
            });
            missionTemplates.visit_cr_species.onEvent.mockReset();
        });
        
        it('should process event, update progress, but not complete mission if target not met', async () => {
            mockUserMissionInstance.params.targetCount = 2;
            missionTemplates.visit_cr_species.onEvent.mockResolvedValue(true);
            
            await missionController.handleEvent(mockReq, mockRes);
            
            expect(missionTemplates.visit_cr_species.onEvent).toHaveBeenCalledWith(mockReq.body.event, mockUserMissionInstance.params);
            expect(mockUserMissionInstance.progress.seen).toEqual(['sp1']);
            expect(mockUserMissionInstance.completed).toBe(false);
            expect(mockUserMissionInstance.save).toHaveBeenCalledTimes(1);
            expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith({
                completed: false,
                progress: { seen: ['sp1'] },
            });
        });
        
        it('should process event and complete mission if target met', async () => {
            missionTemplates.visit_cr_species.onEvent.mockResolvedValue(true);
            User.findByIdAndUpdate.mockResolvedValue({}); 
            
            await missionController.handleEvent(mockReq, mockRes);
            
            expect(mockUserMissionInstance.progress.seen).toEqual(['sp1']);
            expect(mockUserMissionInstance.completed).toBe(true);
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith('testUserId', { $inc: { xp: 10 } });
            expect(mockUserMissionInstance.save).toHaveBeenCalledTimes(1);
            expect(mockRes.json).toHaveBeenCalledWith({
                completed: true,
                progress: { seen: ['sp1'] },
            });
        });
        
        it('should not update progress or complete if onEvent returns false', async () => {
            missionTemplates.visit_cr_species.onEvent.mockResolvedValue(false);
            
            await missionController.handleEvent(mockReq, mockRes);
            
            expect(mockUserMissionInstance.progress.seen).toEqual([]); 
            expect(mockUserMissionInstance.completed).toBe(false);
            expect(mockUserMissionInstance.save).not.toHaveBeenCalled(); 
            expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith({
                completed: false,
                progress: { seen: [] },
            });
        });
        
        it('should not add duplicate speciesId to progress.seen', async () => {
            mockUserMissionInstance.progress.seen = ['sp1'];
            missionTemplates.visit_cr_species.onEvent.mockResolvedValue(true);
            
            await missionController.handleEvent(mockReq, mockRes);
            
            expect(mockUserMissionInstance.progress.seen).toEqual(['sp1']); 
            expect(mockUserMissionInstance.save).toHaveBeenCalledTimes(1); 
        });
    });
});