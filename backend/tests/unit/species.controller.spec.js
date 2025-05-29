jest.mock('../../models/Species');
jest.mock('../../controllers/cluster.controller', () => ({
    updateClusterForSpecies: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../services/populate.service');
jest.mock('../../services/gbif.service');
jest.mock('../../services/iucn.service');
jest.mock('sanitize-html', () => jest.fn(input => input.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()));

const speciesController = require('../../controllers/species.controller');
const Species = require('../../models/Species');
describe('Species Controller - Unit Tests', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockReq = {
            body: {},
            params: {},
            query: {},
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
        };
        
        jest.clearAllMocks();

        Species.findById = jest.fn();
        Species.find = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue([]),
            lean: jest.fn().mockReturnThis(),
            maxTimeMS: jest.fn().mockResolvedValue([]),
        });
        Species.create = jest.fn();
        Species.countDocuments = jest.fn().mockResolvedValue(0);
        Species.prototype.save = jest.fn().mockResolvedValue(this);
    });

    describe('getSpeciesById', () => {
        it('should return a species if found', async () => {
            const mockSpecies = { _id: 'testId', common_name: 'Tiger' };
            Species.findById.mockResolvedValue(mockSpecies);
            mockReq.params.id = 'testId';

            await speciesController.getSpeciesById(mockReq, mockRes);

            expect(Species.findById).toHaveBeenCalledWith('testId');
            expect(mockRes.json).toHaveBeenCalledWith(mockSpecies);
        });

        it('should return 404 if species not found', async () => {
            Species.findById.mockResolvedValue(null);
            mockReq.params.id = 'notFoundId';

            await speciesController.getSpeciesById(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Especie no encontrada' });
        });

        it('should return 500 on database error', async () => {
            Species.findById.mockRejectedValue(new Error('DB Error'));
            mockReq.params.id = 'testId';
            await speciesController.getSpeciesById(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error al obtener especie' });
        });
    });
    
    describe('getSpeciesByCountry', () => {
        it('should return species for a given country', async () => {
            const mockSpeciesList = [{ _id: '1', common_name: 'Condor', locations: [{ country: 'CL' }] }];
            Species.find.mockResolvedValue(mockSpeciesList);
            mockReq.params.country = 'cl'; // Test lowercase input

            await speciesController.getSpeciesByCountry(mockReq, mockRes);

            expect(Species.find).toHaveBeenCalledWith({ "locations.country": 'CL' });
            expect(mockRes.json).toHaveBeenCalledWith(mockSpeciesList);
        });

        it('should return 404 if no species found for the country', async () => {
            Species.find.mockResolvedValue([]);
            mockReq.params.country = 'XX';

            await speciesController.getSpeciesByCountry(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'No se encontraron especies para este país' });
        });

         it('should return 500 on database error', async () => {
            Species.find.mockRejectedValue(new Error('DB Error'));
            mockReq.params.country = 'CL';
            await speciesController.getSpeciesByCountry(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error al obtener especies por país' });
        });
    });

    describe('searchSpecies', () => {
        const zapataRailData = {
            _id: '67fd1e6ed79b4e8ecd7aa334',
            taxon_id: "2474370",
            common_name: "Zapata Rail",
            scientific_name: "Cyanolimnas cerverai",
            category: "CR",
            locations: [
                { country: "CU", continent: "North America", lat: 22.30444, lng: -81.37778, _id: "67fd1e6ed79b4e8ecd7aa336" },
                { country: "NG", continent: "Africa", lat: 6.41, lng: 3.3, _id: "67fd1e6ed79b4e8ecd7aa335" }
            ],
        };

        it('should return 400 if search term is less than 3 characters', async () => {
            mockReq.query = { q: 'ab' };
            await speciesController.searchSpecies(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'El término debe tener al menos 3 caracteres',
                code: 'SHORT_QUERY'
            });
        });

        it('should find "Zapata Rail" by common name and return formatted results', async () => {
            const searchTerm = 'Zapata';
            mockReq.query = { q: searchTerm, limit: '10' };
            
            Species.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                maxTimeMS: jest.fn().mockResolvedValue([zapataRailData]),
            });

            await speciesController.searchSpecies(mockReq, mockRes);
            
            const expectedQuery = {
                $or: [
                    { common_name: new RegExp(searchTerm, 'i') },
                    { scientific_name: new RegExp(searchTerm, 'i') },
                    { 'locations.country': new RegExp(searchTerm, 'i') }
                ]
            };
            expect(Species.find).toHaveBeenCalledWith(expectedQuery);
            expect(Species.find().limit).toHaveBeenCalledWith(10);

            const expectedFormattedResults = [
                { 
                    id: zapataRailData._id, 
                    lat: zapataRailData.locations[0].lat, 
                    lng: zapataRailData.locations[0].lng, 
                    common_name: zapataRailData.common_name, 
                    scientific_name: zapataRailData.scientific_name, 
                    category: zapataRailData.category, 
                    country: zapataRailData.locations[0].country 
                },
                { 
                    id: zapataRailData._id, 
                    lat: zapataRailData.locations[1].lat, 
                    lng: zapataRailData.locations[1].lng, 
                    common_name: zapataRailData.common_name, 
                    scientific_name: zapataRailData.scientific_name, 
                    category: zapataRailData.category, 
                    country: zapataRailData.locations[1].country
                }
            ];
            expect(mockRes.json).toHaveBeenCalledWith(expectedFormattedResults);
        });

        it('should find "Cyanolimnas cerverai" by scientific name', async () => {
            const searchTerm = 'Cyanolimnas';
            mockReq.query = { q: searchTerm };
            
            Species.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                maxTimeMS: jest.fn().mockResolvedValue([zapataRailData]),
            });

            await speciesController.searchSpecies(mockReq, mockRes);
            
            expect(Species.find).toHaveBeenCalledWith(expect.objectContaining({
                 $or: expect.arrayContaining([
                    expect.objectContaining({ scientific_name: new RegExp(searchTerm, 'i') })
                 ])
            }));
            expect(mockRes.json).toHaveBeenCalled();
        });
        
        it('should handle empty locations gracefully during formatting (using Zapata Rail with no locations for test)', async () => {
            mockReq.query = { q: 'Zapata' };
            const zapataRailNoLocations = { ...zapataRailData, locations: [] };
            Species.find.mockReturnValueOnce({
                select: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                maxTimeMS: jest.fn().mockResolvedValue([zapataRailNoLocations]),
            });
            await speciesController.searchSpecies(mockReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith([]);
        });

        it('should return 500 on database error during search', async () => {
            mockReq.query = { q: 'Zapata' };
            Species.find.mockReturnValueOnce({
                select: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                maxTimeMS: jest.fn().mockRejectedValue(new Error('DB Search Error')),
            });
            await speciesController.searchSpecies(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
             expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Error interno',
                code: 'SERVER_ERROR'
            }));
        });
    });

});