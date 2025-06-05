const clusterController = require('../../controllers/cluster.controller');
const Species = require('../../models/Species');
const Cluster = require('../../models/Cluster');
const speciesController = require('../../controllers/species.controller');
const geoService = require('../../services/geo.service');
const gbifService = require('../../services/gbif.service');
const countries = require('i18n-iso-countries');
const worldCountries = require('world-countries');
const { getContinentName } = require('@brixtol/country-continent');

jest.mock('../../models/Species');
jest.mock('../../models/Cluster');
jest.mock('../../controllers/species.controller');
jest.mock('../../services/geo.service');
jest.mock('../../services/gbif.service');
jest.mock('i18n-iso-countries');
jest.mock('world-countries', () => ({
    find: jest.fn()
}));
jest.mock('@brixtol/country-continent');

describe('Cluster Controller - Unit Tests', () => {
    let mockReq, mockRes;
    
    beforeEach(() => {
        mockReq = { body: {}, params: {} };
        mockRes = {
            json: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
        
        countries.getName.mockReturnValue('Test Country Name');
        getContinentName.mockReturnValue('Test Continent');
        geoService.getCountryCoordinates.mockReturnValue({ lat: 10, lng: 20 });
        worldCountries.find.mockReturnValue({ cca2: 'DEFAULT', area: 100000 });
    });
    
    describe('computeMarkerSize', () => {
        it('should compute marker size based on country area for Nigeria (NG)', async () => {
            worldCountries.find.mockReturnValue({ cca2: 'NG', area: 923768 });
            const size = await clusterController.computeMarkerSize('NG');
            expect(size).toBeCloseTo(59.65562913892205, 5);
        });
        
        it('should return default size (50) if country data is not found', async () => {
            worldCountries.find.mockReturnValue(null);
            const size = await clusterController.computeMarkerSize('XX');
            expect(size).toBe(50);
        });
        
        it('should return default size (50) if country area is not defined', async () => {
            worldCountries.find.mockReturnValue({ cca2: 'YY' });
            const size = await clusterController.computeMarkerSize('YY');
            expect(size).toBe(50);
        });
        
        it('should cap marker size at min (10)', async () => {
            worldCountries.find.mockReturnValue({ cca2: 'VA', area: 0.44 });
            const size = await clusterController.computeMarkerSize('VA');
            expect(size).toBe(10);
        });
        
        it('should cap marker size at max (150)', async () => {
            worldCountries.find.mockReturnValue({ cca2: 'RU_XL', area: Math.pow(10, 16) });
            const size = await clusterController.computeMarkerSize('RU_XL');
            expect(size).toBe(150);
        });
    });
    
    describe('updateClusterForSpecies', () => {
        let mockSpeciesInputBody;
        let mockExistingCluster;
        let mockSaveClusterFn;
        
        beforeEach(() => {
            mockSpeciesInputBody = {
                scientific_name: 'Test Species',
                category: 'CR',
                locations: [{ country: 'UY', lat: -33, lng: -56 }]
            };
            mockSaveClusterFn = jest.fn().mockResolvedValue(true);
            
            mockExistingCluster = null;
            Cluster.findOne.mockImplementation(() => Promise.resolve(mockExistingCluster));
            
            Cluster.mockImplementation(data => ({
                ...data,
                save: mockSaveClusterFn
            }));
            
            worldCountries.find.mockReturnValue({ cca2: 'UY', area: 176215 });
        });
        
        it('should create a new cluster if it does not exist', async () => {
            Cluster.findOne.mockResolvedValue(null);
            countries.getName.mockReturnValue('Uruguay');
            geoService.getCountryCoordinates.mockReturnValue({ lat: -32.5, lng: -55.7 });
            
            await clusterController.updateClusterForSpecies({ body: mockSpeciesInputBody }, mockRes);
            
            expect(Cluster.findOne).toHaveBeenCalledWith({ country: 'UY' });
            expect(worldCountries.find).toHaveBeenCalledWith(expect.any(Function));
            const findCallback = worldCountries.find.mock.calls[0][0];
            expect(findCallback({ cca2: 'UY' })).toBe(true);
            
            expect(mockSaveClusterFn).toHaveBeenCalledTimes(1);
            expect(Cluster).toHaveBeenCalledTimes(1);
            const newClusterData = Cluster.mock.calls[0][0];
            expect(newClusterData).toMatchObject({
                country: 'UY',
                countryName: 'Uruguay',
                count: 1,
                lat: -32.5,
                lng: -55.7,
                worstCategory: 'CR',
            });
            expect(newClusterData.markerSize).toBeCloseTo(Math.log10(176215) * 10, 1);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ message: "Cluster(s) actualizado(s) correctamente" });
        });
        
        it('should update an existing cluster (count and keeping worse category)', async () => {
            mockExistingCluster = {
                country: 'UY',
                countryName: 'Uruguay',
                count: 1,
                lat: -33,
                lng: -56,
                worstCategory: 'EW',
                markerSize: 50,
                save: mockSaveClusterFn,
            };
            Cluster.findOne.mockResolvedValue(mockExistingCluster);
            
            mockSpeciesInputBody.category = 'CR';
            
            await clusterController.updateClusterForSpecies({ body: mockSpeciesInputBody }, mockRes);
            
            expect(Cluster.findOne).toHaveBeenCalledWith({ country: 'UY' });
            expect(mockExistingCluster.count).toBe(2);
            expect(mockExistingCluster.worstCategory).toBe('EW');
            expect(mockSaveClusterFn).toHaveBeenCalledTimes(1);
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });
        
        it('should update worstCategory if new species has a "worse" category', async () => {
            mockExistingCluster = {
                country: 'UY', count: 1, worstCategory: 'CR', save: mockSaveClusterFn,
            };
            Cluster.findOne.mockResolvedValue(mockExistingCluster);
            
            mockSpeciesInputBody.category = 'EX';
            
            await clusterController.updateClusterForSpecies({ body: mockSpeciesInputBody }, mockRes);
            
            expect(mockExistingCluster.worstCategory).toBe('EX');
            expect(mockSaveClusterFn).toHaveBeenCalledTimes(1);
        });
        
        it('should handle input directly (no req.body) if res is null (internal call)', async () => {
            Cluster.findOne.mockResolvedValue(null);

            await clusterController.updateClusterForSpecies(mockSpeciesInputBody, null);
            
            expect(mockSaveClusterFn).toHaveBeenCalledTimes(1);
            expect(mockRes.status).not.toHaveBeenCalled();
            expect(mockRes.json).not.toHaveBeenCalled();
        });
        
        it('should throw error and not call res if species has no locations and res is null', async () => {
            mockSpeciesInputBody.locations = null;
            await expect(clusterController.updateClusterForSpecies(mockSpeciesInputBody, null))
            .rejects.toThrow("La especie no posee ubicaciones válidas.");
            expect(mockRes.status).not.toHaveBeenCalled();
            expect(mockRes.json).not.toHaveBeenCalled();
        });
        
        it('should call res.status(500) if species has no locations and res is provided', async () => {
            mockSpeciesInputBody.locations = [];
            await clusterController.updateClusterForSpecies({ body: mockSpeciesInputBody }, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                error: "Error al actualizar clusters",
                details: "La especie no posee ubicaciones válidas."
            }));
        });
        
        
        it('should use location lat/lng for new cluster if getCountryCoordinates returns null', async () => {
            Cluster.findOne.mockResolvedValue(null);
            geoService.getCountryCoordinates.mockReturnValue(null);
            countries.getName.mockReturnValue('Uruguay');
            
            await clusterController.updateClusterForSpecies({ body: mockSpeciesInputBody }, mockRes);
            
            expect(mockSaveClusterFn).toHaveBeenCalledTimes(1);
            expect(Cluster).toHaveBeenCalledTimes(1);
            const newClusterData = Cluster.mock.calls[0][0];
            expect(newClusterData.lat).toBe(mockSpeciesInputBody.locations[0].lat);
            expect(newClusterData.lng).toBe(mockSpeciesInputBody.locations[0].lng);
        });
    });
    
    describe('getSpeciesClusters', () => {
        it('should return a sorted list of clusters', async () => {
            const mockClusters = [{ country: 'UY', name: 'Uruguay' }, { country: 'AR', name: 'Argentina' }];
            Cluster.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockClusters)
            });
            
            await clusterController.getSpeciesClusters(mockReq, mockRes);
            
            expect(Cluster.find).toHaveBeenCalledTimes(1);
            expect(Cluster.find().sort).toHaveBeenCalledWith({ country: 1 });
            expect(mockRes.json).toHaveBeenCalledWith(mockClusters);
        });
        
        it('should handle errors when getting clusters', async () => {
            Cluster.find.mockReturnValue({
                sort: jest.fn().mockRejectedValue(new Error('DB Error when getting clusters'))
            });
            await clusterController.getSpeciesClusters(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "Error al obtener clusters" });
        });
    });
    
    describe('updateClusterStatusFromAPI', () => {
        let mockGbifOccurrence;
        let mockClusterForUpdateInstance;
        let mockSpeciesSaveFn;
        
        beforeEach(() => {
            mockReq.body = { country: 'CL', updatedAt: '2023-01-01T00:00:00.000Z', id: 'clusterIdCL' };
            
            mockGbifOccurrence = {
                taxonKey: 12345,
                decimalLatitude: -33.45,
                decimalLongitude: -70.67,
                countryCode: 'CL',
                gbifID: 'gbifOcc1',
                scientificName: 'Testus Specius Nomen',
                iucnRedListCategory: 'CR',
                kingdom: 'Animalia', phylum: 'Chordata', class: 'Mammalia',
                order: 'Carnivora', family: 'Felidae', genus: 'Testus',
            };
            
            gbifService.getGbifCountryData.mockReset();
            
            Species.findOne.mockReset();
            mockSpeciesSaveFn = jest.fn().mockResolvedValue(true);
            
            speciesController.createSpecies.mockReset().mockResolvedValue({ message: 'Mocked species created' });
            
            Cluster.findById.mockReset();
            mockClusterForUpdateInstance = {
                _id: 'clusterIdCL',
                country: 'CL',
                count: 0,
                worstCategory: 'LC',
                category: 'LC',
                save: jest.fn().mockResolvedValue(true),
            };
            Cluster.findById.mockResolvedValue(mockClusterForUpdateInstance);
            
            Species.find.mockReset().mockResolvedValue([{ category: 'CR' }]);
        });
        
        it('should update cluster, create new species if not found via controller', async () => {
            gbifService.getGbifCountryData
            .mockResolvedValueOnce({ count: 1, results: [] })
            .mockResolvedValueOnce({ count: 1, results: [mockGbifOccurrence] });
            Species.findOne.mockResolvedValue(null);
            
            await clusterController.updateClusterStatusFromAPI(mockReq, mockRes);
            
            expect(gbifService.getGbifCountryData).toHaveBeenCalledTimes(2);
            expect(Species.findOne).toHaveBeenCalledWith({ taxon_id: mockGbifOccurrence.taxonKey });
            expect(speciesController.createSpecies).toHaveBeenCalledTimes(1);
            const createSpeciesArg = speciesController.createSpecies.mock.calls[0][0];
            expect(createSpeciesArg.body.taxon_id).toBe(mockGbifOccurrence.taxonKey);
            expect(createSpeciesArg.body.category).toBe(mockGbifOccurrence.iucnRedListCategory);
            
            expect(Cluster.findById).toHaveBeenCalledWith('clusterIdCL');
            expect(mockClusterForUpdateInstance.save).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Cluster actualizado',
                cluster: expect.objectContaining({ updated: true, category: 'CR' })
            }));
        });
        
        it('should update existing species if found (add location and gbifId)', async () => {
            gbifService.getGbifCountryData
            .mockResolvedValueOnce({ count: 1, results: [] })
            .mockResolvedValueOnce({ count: 1, results: [mockGbifOccurrence] });
            
            const existingSpeciesInstance = {
                taxon_id: mockGbifOccurrence.taxonKey,
                scientific_name: 'Existing Specius', category: 'EN',
                locations: [], gbifIds: [],
                save: mockSpeciesSaveFn
            };
            Species.findOne.mockResolvedValue(existingSpeciesInstance);
            
            await clusterController.updateClusterStatusFromAPI(mockReq, mockRes);
            
            expect(speciesController.createSpecies).not.toHaveBeenCalled();
            expect(existingSpeciesInstance.locations).toContainEqual(expect.objectContaining({ country: 'CL' }));
            expect(existingSpeciesInstance.gbifIds).toContain(String(mockGbifOccurrence.gbifID));
            expect(mockSpeciesSaveFn).toHaveBeenCalledTimes(1);
            
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Cluster actualizado' }));
        });
        
        
        it('should return 400 if countryCode is missing in request body', async () => {
            mockReq.body.country = undefined;
            await clusterController.updateClusterStatusFromAPI(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Falta el countryCode' });
        });
        
        it('should handle errors from GBIF service call', async () => {
            gbifService.getGbifCountryData.mockReset().mockRejectedValue(new Error('GBIF Service Error'));
            await clusterController.updateClusterStatusFromAPI(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "Error interno al actualizar el cluster" });
        });
        
        it('should correctly compute date range for GBIF query', async () => {
            mockReq.body.updatedAt = '2024-05-10T12:00:00.000Z';
            const expectedDateMin = '2024-05-10';
            const currentDate = new Date('2024-06-03T10:00:00.000Z');
            const realDate = Date;
            global.Date = class extends Date {
                constructor(...args) {
                    if (args.length) {
                        super(...args);
                        return this;
                    }
                    return currentDate;
                }
                static now() { return currentDate.getTime(); }
            };
            gbifService.getGbifCountryData.mockResolvedValueOnce({ count: 0, results: [] })
            
            await clusterController.updateClusterStatusFromAPI(mockReq, mockRes);
            
            expect(gbifService.getGbifCountryData.mock.calls[0][1]).toBe(expectedDateMin);
            expect(gbifService.getGbifCountryData.mock.calls[0][2]).toBe('2024-06-03');
            
            global.Date = realDate;
        });
    });
});